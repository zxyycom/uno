/**
 * 游戏状态机 - 基于 xstate v5
 * 管理游戏完整流程状态转换
 */

import { setup, assign } from "xstate";
import {
    Card,
    CardColor,
    GameConfig,
    GameDirection,
    Player,
    PlayerType,
    UnoCardType,
} from "../types/game.types";
import { GameEventType, publishEvent } from "../events/game.events";
import { createDeck, shuffle } from "../logic/deck.logic";
import { AIManager } from "../ai/ai-manager";

// ==================== 类型定义 ====================

/** 游戏状态 */
export type GameState = 
    | "idle"
    | "dealing"
    | "playing"
    | "checkingWin"
    | "gameOver";

/** 游戏上下文 */
export interface GameMachineContext {
    players: Player[];
    currentPlayerIndex: number;
    deck: Card[];
    discardPile: Card[];
    direction: GameDirection;
    activeColor: CardColor;
    pendingDraw2Count: number;
    pendingDraw4Count: number;
    config: GameConfig;
    lastPlayerId: string | null;
    winner: Player | null;
    aiManager: AIManager | null;
}

// ==================== 事件类型 ====================

export type GameMachineEvent =
    | { type: "START_GAME"; playerCount: number; aiCount: number }
    | { type: "DEAL_COMPLETE" }
    | { type: "PLAY_CARD"; playerId: string; cardId: string; chosenColor?: CardColor }
    | { type: "DRAW_CARD"; playerId: string }
    | { type: "TURN_TIMEOUT" }
    | { type: "CALL_UNO"; playerId: string }
    | { type: "AI_DECISION"; action: "play" | "draw"; cardId?: string; chosenColor?: CardColor }
    | { type: "RESET" };

// ==================== 辅助函数 ====================

function getNextPlayerIndex(
    currentIndex: number,
    playerCount: number,
    direction: GameDirection,
    skip: number = 0,
): number {
    let nextIndex = currentIndex;
    for (let i = 0; i <= skip; i++) {
        nextIndex = (nextIndex + direction + playerCount) % playerCount;
    }
    return nextIndex;
}

function emitGameEvent(type: GameEventType, payload?: unknown): void {
    publishEvent({ type, timestamp: Date.now(), payload });
}

function checkWin(players: Player[]): Player | null {
    return players.find((p) => p.hand.length === 0) || null;
}

function initializePlayers(aiCount: number): Player[] {
    const players: Player[] = [];
    players.push({
        id: "player_0",
        name: "你",
        type: PlayerType.HUMAN,
        hand: [],
        calledUno: false,
    });
    for (let i = 1; i <= aiCount; i++) {
        players.push({
            id: "ai_" + i,
            name: "AI玩家" + i,
            type: PlayerType.AI,
            hand: [],
            calledUno: false,
        });
    }
    return players;
}

// ==================== 状态机定义 ====================

export const createGameMachine = setup({
    types: {
        context: {} as GameMachineContext,
        events: {} as GameMachineEvent,
    },
    actions: {
        startGame: assign({
            players: ({ event }) => {
                if (event.type !== "START_GAME") return [];
                return initializePlayers(event.aiCount);
            },
            deck: () => shuffle(createDeck()),
            discardPile: () => [],
            currentPlayerIndex: () => 0,
            direction: () => GameDirection.CLOCKWISE,
            activeColor: () => CardColor.RED,
            pendingDraw2Count: () => 0,
            pendingDraw4Count: () => 0,
            lastPlayerId: () => null,
            winner: () => null,
            aiManager: ({ context }) => context.aiManager || new AIManager(context.config),
        }),

        dealComplete: assign(({ context }) => {
            const cardsPerPlayer = 7;
            const updatedPlayers = context.players.map((player) => ({
                ...player,
                hand: context.deck.slice(0, cardsPerPlayer),
            }));
            const deckCopy = [...context.deck];
            let firstCard = deckCopy.pop()!;
            while (firstCard.type === UnoCardType.WILD_DRAW_4 && deckCopy.length > 0) {
                deckCopy.unshift(firstCard);
                firstCard = deckCopy.pop()!;
            }
            return {
                ...context,
                players: updatedPlayers,
                deck: deckCopy.slice(cardsPerPlayer * context.players.length),
                discardPile: [firstCard],
                activeColor: firstCard.color || CardColor.RED,
            };
        }),

        playCard: assign(({ context, event }) => {
            if (event.type !== "PLAY_CARD") return context;
            const { playerId, cardId, chosenColor } = event;
            const playerIndex = context.players.findIndex((p) => p.id === playerId);
            if (playerIndex === -1) return context;
            const player = context.players[playerIndex];
            const cardIndex = player.hand.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) return context;
            const card = { ...player.hand[cardIndex] };
            const newHand = [...player.hand];
            newHand.splice(cardIndex, 1);
            const newColor = (card.type === UnoCardType.WILD || card.type === UnoCardType.WILD_DRAW_4)
                ? (chosenColor || context.activeColor)
                : card.color;
            let newPendingDraw2 = context.pendingDraw2Count;
            let newPendingDraw4 = context.pendingDraw4Count;
            if (card.type === UnoCardType.DRAW_2) newPendingDraw2 += 2;
            else if (card.type === UnoCardType.WILD_DRAW_4) newPendingDraw4 += 4;
            const updatedPlayers = [...context.players];
            updatedPlayers[playerIndex] = { ...player, hand: newHand };
            emitGameEvent(GameEventType.CARD_PLAYED, { playerId, cardId, card });
            return {
                ...context,
                players: updatedPlayers,
                discardPile: [...context.discardPile, { ...card, color: newColor }],
                activeColor: newColor || context.activeColor,
                pendingDraw2Count: newPendingDraw2,
                pendingDraw4Count: newPendingDraw4,
                lastPlayerId: playerId,
            };
        }),

        drawCard: assign(({ context, event }) => {
            if (event.type !== "DRAW_CARD") return context;
            const { playerId } = event;
            const playerIndex = context.players.findIndex((p) => p.id === playerId);
            if (playerIndex === -1) return context;
            let deck = [...context.deck];
            let discardPile = [...context.discardPile];
            if (deck.length === 0 && discardPile.length > 1) {
                const topCard = discardPile.pop()!;
                deck = shuffle([...discardPile]);
                discardPile = [topCard];
            }
            if (deck.length === 0) return context;
            const drawnCard = deck.pop()!;
            const player = context.players[playerIndex];
            const updatedPlayers = [...context.players];
            updatedPlayers[playerIndex] = { ...player, hand: [...player.hand, drawnCard] };
            emitGameEvent(GameEventType.CARD_DRAWN, { playerId, card: drawnCard });
            return { ...context, players: updatedPlayers, deck, discardPile };
        }),

        nextPlayer: assign(({ context }) => {
            let skipCount = 0;
            let directionChange = false;
            const topCard = context.discardPile[context.discardPile.length - 1];
            if (topCard.type === UnoCardType.SKIP) skipCount = 1;
            else if (topCard.type === UnoCardType.REVERSE) directionChange = true;
            const newDirection = directionChange ? -context.direction : context.direction;
            const newIndex = getNextPlayerIndex(
                context.currentPlayerIndex,
                context.players.length,
                newDirection,
                skipCount,
            );
            emitGameEvent(GameEventType.TURN_STARTED, { 
                playerId: context.players[newIndex]?.id,
                playerName: context.players[newIndex]?.name,
            });
            return {
                ...context,
                currentPlayerIndex: newIndex,
                direction: newDirection,
            };
        }),

        setWinner: assign(({ context }) => {
            const winner = checkWin(context.players);
            if (winner) {
                emitGameEvent(GameEventType.GAME_OVER, { winnerId: winner.id, winnerName: winner.name });
            }
            return { ...context, winner };
        }),

        resetGame: assign(() => ({
            players: [],
            currentPlayerIndex: 0,
            deck: [],
            discardPile: [],
            direction: GameDirection.CLOCKWISE,
            activeColor: CardColor.RED,
            pendingDraw2Count: 0,
            pendingDraw4Count: 0,
            lastPlayerId: null,
            winner: null,
        })),
    },
});

// ==================== 状态机配置 ====================

export const gameMachineConfig = {
    id: "unoGame",
    initial: "idle" as GameState,
    context: {
        players: [],
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        direction: 1,
        activeColor: "red",
        pendingDraw2Count: 0,
        pendingDraw4Count: 0,
        config: {
            playerCount: 1,
            aiCount: 1,
            timeoutSeconds: 30,
            dealInterval: 100,
            aiThinkDelay: 1500,
        },
        lastPlayerId: null,
        winner: null,
        aiManager: null,
    } as GameMachineContext,
    states: {
        idle: {
            on: {
                START_GAME: {
                    target: "dealing",
                    actions: "startGame",
                },
            },
        },
        dealing: {
            on: {
                DEAL_COMPLETE: {
                    target: "playing",
                    actions: "dealComplete",
                },
            },
        },
        playing: {
            on: {
                PLAY_CARD: {
                    actions: ["playCard", "setWinner", "nextPlayer"],
                },
                DRAW_CARD: {
                    actions: "drawCard",
                },
                TURN_TIMEOUT: {
                    actions: "drawCard",
                },
            },
        },
        checkingWin: {
            always: [
                { target: "gameOver", cond: (context: GameMachineContext) => context.winner !== null },
                { target: "playing" },
            ],
        },
        gameOver: {
            on: {
                RESET: {
                    target: "idle",
                    actions: "resetGame",
                },
            },
        },
    },
};
