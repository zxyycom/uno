/**
 * 游戏状态机 - 基于 xstate v5
 * 管理游戏完整流程状态转换
 */

import { assign, createMachine } from 'xstate';

import { AIManager } from '../ai/ai-manager';
import { eventBus, GameEventType } from '../events';
import { createDeck, shuffle } from '../logic/deck.logic';
import {
    Card,
    CardColor,
    GameConfig,
    GameDirection,
    Player,
    PlayerType,
    UnoCardType,
} from '../types/game.types';

// ==================== 类型定义 ====================

/** 游戏状态 */
export type GameState = 'idle' | 'dealing' | 'playing' | 'gameOver';

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
    | { type: 'START_GAME'; playerCount: number; aiCount: number }
    | { type: 'DEAL_COMPLETE' }
    | {
          type: 'PLAY_CARD';
          playerId: string;
          cardId: string;
          chosenColor?: CardColor;
      }
    | { type: 'DRAW_CARD'; playerId: string }
    | { type: 'TURN_TIMEOUT' }
    | { type: 'CALL_UNO'; playerId: string }
    | {
          type: 'AI_DECISION';
          action: 'play' | 'draw';
          cardId?: string;
          chosenColor?: CardColor;
      }
    | { type: 'RESET' };

// ==================== 辅助函数 ====================

function getNextPlayerIndex(
    currentIndex: number,
    playerCount: number,
    direction: GameDirection,
    skip: number = 0
): number {
    let nextIndex = currentIndex;
    for (let i = 0; i <= skip; i++) {
        nextIndex = (nextIndex + direction + playerCount) % playerCount;
    }
    return nextIndex;
}

function checkWin(players: Player[]): Player | null {
    return players.find((p) => p.hand.length === 0) || null;
}

function initializePlayers(aiCount: number): Player[] {
    const players: Player[] = [];
    players.push({
        id: 'player_0',
        name: '你',
        type: PlayerType.HUMAN,
        hand: [],
        calledUno: false,
    });
    for (let i = 1; i <= aiCount; i++) {
        players.push({
            id: 'ai_' + i,
            name: 'AI玩家' + i,
            type: PlayerType.AI,
            hand: [],
            calledUno: false,
        });
    }
    return players;
}

// ==================== 状态机 ====================

export const createGameMachine = () =>
    createMachine({
        id: 'unoGame',
        initial: 'idle' as GameState,
        context: {
            players: [] as Player[],
            currentPlayerIndex: 0,
            deck: [] as Card[],
            discardPile: [] as Card[],
            direction: 1 as GameDirection,
            activeColor: 'red' as CardColor,
            pendingDraw2Count: 0,
            pendingDraw4Count: 0,
            config: {
                playerCount: 1,
                aiCount: 1,
                timeoutSeconds: 30,
                dealInterval: 100,
                aiThinkDelay: 1500,
            } as GameConfig,
            lastPlayerId: null as string | null,
            winner: null as Player | null,
            aiManager: null as AIManager | null,
        } as GameMachineContext,
        states: {
            idle: {
                on: {
                    START_GAME: {
                        target: 'dealing',
                        actions: assign({
                            players: ({ event }) => {
                                if (event.type !== 'START_GAME') return [];
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
                        }),
                    },
                },
            },
            dealing: {
                on: {
                    DEAL_COMPLETE: {
                        target: 'playing',
                        actions: assign(({ context }) => {
                            const cardsPerPlayer = 7;
                            const updatedPlayers = context.players.map(
                                (player) => ({
                                    ...player,
                                    hand: context.deck.slice(0, cardsPerPlayer),
                                })
                            );
                            const deckCopy = [...context.deck];
                            let firstCard = deckCopy.pop()!;
                            while (
                                firstCard.type === UnoCardType.WILD_DRAW_4 &&
                                deckCopy.length > 0
                            ) {
                                deckCopy.unshift(firstCard);
                                firstCard = deckCopy.pop()!;
                            }
                            return {
                                players: updatedPlayers,
                                deck: deckCopy.slice(
                                    cardsPerPlayer * context.players.length
                                ),
                                discardPile: [firstCard],
                                activeColor: firstCard.color || CardColor.RED,
                            };
                        }),
                    },
                },
            },
            playing: {
                on: {
                    PLAY_CARD: {
                        actions: assign(({ context, event }) => {
                            if (event.type !== 'PLAY_CARD') return {};
                            const { playerId, cardId, chosenColor } = event;
                            const playerIndex = context.players.findIndex(
                                (p) => p.id === playerId
                            );
                            if (playerIndex === -1) return {};
                            const player = context.players[playerIndex];
                            const cardIndex = player.hand.findIndex(
                                (c) => c.id === cardId
                            );
                            if (cardIndex === -1) return {};
                            const card = { ...player.hand[cardIndex] };
                            const newHand = [...player.hand];
                            newHand.splice(cardIndex, 1);
                            const newColor =
                                card.type === UnoCardType.WILD ||
                                card.type === UnoCardType.WILD_DRAW_4
                                    ? chosenColor || context.activeColor
                                    : card.color;
                            let newPendingDraw2 = context.pendingDraw2Count;
                            let newPendingDraw4 = context.pendingDraw4Count;
                            if (card.type === UnoCardType.DRAW_2)
                                newPendingDraw2 += 2;
                            else if (card.type === UnoCardType.WILD_DRAW_4)
                                newPendingDraw4 += 4;
                            const updatedPlayers = [...context.players];
                            updatedPlayers[playerIndex] = {
                                ...player,
                                hand: newHand,
                            };
                            eventBus.emit(GameEventType.CARD_PLAYED, {
                                playerId,
                                cardId,
                                card,
                            });
                            return {
                                players: updatedPlayers,
                                discardPile: [
                                    ...context.discardPile,
                                    { ...card, color: newColor },
                                ],
                                activeColor: newColor || context.activeColor,
                                pendingDraw2Count: newPendingDraw2,
                                pendingDraw4Count: newPendingDraw4,
                                lastPlayerId: playerId,
                            };
                        }),
                    },
                    DRAW_CARD: {
                        actions: assign(({ context, event }) => {
                            if (event.type !== 'DRAW_CARD') return {};
                            const { playerId } = event;
                            const playerIndex = context.players.findIndex(
                                (p) => p.id === playerId
                            );
                            if (playerIndex === -1) return {};
                            let deck = [...context.deck];
                            let discardPile = [...context.discardPile];
                            if (deck.length === 0 && discardPile.length > 1) {
                                const topCard = discardPile.pop()!;
                                deck = shuffle([...discardPile]);
                                discardPile = [topCard];
                            }
                            if (deck.length === 0) return {};
                            const drawnCard = deck.pop()!;
                            const player = context.players[playerIndex];
                            const updatedPlayers = [...context.players];
                            updatedPlayers[playerIndex] = {
                                ...player,
                                hand: [...player.hand, drawnCard],
                            };
                            eventBus.emit(GameEventType.CARD_DRAWN, {
                                playerId,
                                card: drawnCard,
                            });
                            return {
                                players: updatedPlayers,
                                deck,
                                discardPile,
                            };
                        }),
                    },
                    TURN_TIMEOUT: {
                        actions: assign(({ context, event }) => {
                            if (event.type !== 'DRAW_CARD') return {};
                            const { playerId } = event;
                            const playerIndex = context.players.findIndex(
                                (p) => p.id === playerId
                            );
                            if (playerIndex === -1) return {};
                            let deck = [...context.deck];
                            let discardPile = [...context.discardPile];
                            if (deck.length === 0 && discardPile.length > 1) {
                                const topCard = discardPile.pop()!;
                                deck = shuffle([...discardPile]);
                                discardPile = [topCard];
                            }
                            if (deck.length === 0) return {};
                            const drawnCard = deck.pop()!;
                            const player = context.players[playerIndex];
                            const updatedPlayers = [...context.players];
                            updatedPlayers[playerIndex] = {
                                ...player,
                                hand: [...player.hand, drawnCard],
                            };
                            return {
                                players: updatedPlayers,
                                deck,
                                discardPile,
                            };
                        }),
                    },
                },
            },
            gameOver: {
                on: {
                    RESET: {
                        target: 'idle',
                        actions: assign({
                            players: () => [] as Player[],
                            currentPlayerIndex: () => 0,
                            deck: () => [] as Card[],
                            discardPile: () => [] as Card[],
                            direction: () => GameDirection.CLOCKWISE,
                            activeColor: () => CardColor.RED,
                            pendingDraw2Count: () => 0,
                            pendingDraw4Count: () => 0,
                            lastPlayerId: () => null as string | null,
                            winner: () => null as Player | null,
                        }),
                    },
                },
            },
        },
    });
