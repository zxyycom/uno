/**
 * 游戏管理器 - 整合状态机与游戏逻辑
 */

import { createActor } from "xstate";
import {
    CardColor,
    DEFAULT_GAME_CONFIG,
    GameConfig,
    UnoCardType,
    Card,
    TopCard,
} from "../types/game.types";
import {
    GameEventType,
    publishEvent,
} from "../events/game.events";
import { createGameMachine, gameMachineConfig, GameMachineEvent } from "./game-machine";
import { AIManager } from "../ai/ai-manager";
import { validateCanPlayCard, getPlayableCards, canPlayWildDraw4 } from "../validators/input-validator";

/** 游戏管理器单例 */
export class GameManager {
    private static instance: GameManager | null = null;
    private actor: ReturnType<typeof createActor> | null = null;
    private aiManager: AIManager;
    private config: GameConfig;
    private isProcessing: boolean = false;

    private constructor(config: GameConfig = DEFAULT_GAME_CONFIG) {
        this.config = config;
        this.aiManager = new AIManager(config);
        this.aiManager.setUnoCallback((playerId) => {
            this.actor?.send({ type: "CALL_UNO", playerId });
        });
    }

    /** 获取单例实例 */
    static getInstance(config?: GameConfig): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager(config);
        }
        return GameManager.instance;
    }

    /** 初始化状态机 */
    private initMachine(): void {
        const machine = createGameMachine(gameMachineConfig);
        this.actor = createActor(machine);
        this.actor.start();
    }

    /** 开始新游戏 */
    startGame(playerCount: number = 1, aiCount: number = 1): void {
        this.initMachine();
        this.actor?.send({
            type: "START_GAME",
            playerCount,
            aiCount,
        });
        // 发牌
        setTimeout(() => {
            this.actor?.send({ type: "DEAL_COMPLETE" });
            this.onTurnStarted();
        }, 500);
    }

    /** 获取当前玩家 */
    getCurrentPlayer() {
        const state = this.actor?.getSnapshot();
        if (!state) return null;
        const { players, currentPlayerIndex } = state.context;
        return players[currentPlayerIndex];
    }

    /** 获取顶牌信息 */
    getTopCard(): TopCard | null {
        const state = this.actor?.getSnapshot();
        if (!state || state.context.discardPile.length === 0) return null;
        const top = state.context.discardPile[state.context.discardPile.length - 1];
        return {
            card: top,
            activeColor: state.context.activeColor,
            draw2Count: state.context.pendingDraw2Count,
            draw4Count: state.context.pendingDraw4Count,
        };
    }

    /** 玩家出牌 */
    playCard(cardId: string, chosenColor?: CardColor): boolean {
        if (this.isProcessing) return false;
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.type !== "human") return false;

        const topCard = this.getTopCard();
        if (!topCard) return false;

        const card = currentPlayer.hand.find((c) => c.id === cardId);
        if (!card) return false;

        // WildDraw4 需要额外校验无同色可出
        if (card.type === UnoCardType.WILD_DRAW_4 && topCard.draw4Count === 0) {
            if (canPlayWildDraw4(currentPlayer, topCard)) {
                // 有其他可出的牌，不能出+4
                return false;
            }
        }

        const validation = validateCanPlayCard(
            card,
            topCard,
            topCard.draw2Count,
            topCard.draw4Count,
        );

        if (!validation.valid) {
            return false;
        }

        this.isProcessing = true;
        this.actor?.send({
            type: "PLAY_CARD",
            playerId: currentPlayer.id,
            cardId,
            chosenColor,
        });

        setTimeout(() => this.onTurnStarted(), 300);
        this.isProcessing = false;
        return true;
    }

    /** 玩家摸牌 */
    drawCard(): boolean {
        if (this.isProcessing) return false;
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.type !== "human") return false;

        this.isProcessing = true;
        this.actor?.send({
            type: "DRAW_CARD",
            playerId: currentPlayer.id,
        });

        setTimeout(() => this.onTurnStarted(), 300);
        this.isProcessing = false;
        return true;
    }

    /** 回合开始处理 */
    private onTurnStarted(): void {
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer) return;

        if (currentPlayer.type === "ai") {
            this.handleAITurn();
        } else {
            publishEvent({
                type: GameEventType.TURN_STARTED,
                timestamp: Date.now(),
                payload: { playerId: currentPlayer.id },
            });
        }
    }

    /** AI回合处理 */
    private handleAITurn(): void {
        const currentPlayer = this.getCurrentPlayer();
        const topCard = this.getTopCard();
        if (!currentPlayer || !topCard) return;

        this.aiManager.requestAIDecision(
            currentPlayer,
            topCard,
            topCard.draw2Count,
            topCard.draw4Count,
            true,
            (action) => {
                if (action.action === "play" && action.cardId) {
                    this.actor?.send({
                        type: "PLAY_CARD",
                        playerId: currentPlayer.id,
                        cardId: action.cardId,
                        chosenColor: action.chosenColor,
                    });
                } else {
                    this.actor?.send({
                        type: "DRAW_CARD",
                        playerId: currentPlayer.id,
                    });
                }
                setTimeout(() => this.onTurnStarted(), 500);
            },
        );
    }

    /** 呼叫UNO */
    callUno(): boolean {
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.type !== "human") return false;
        if (currentPlayer.hand.length !== 2) return false;

        publishEvent({
            type: GameEventType.CALL_UNO,
            timestamp: Date.now(),
            payload: { playerId: currentPlayer.id },
        });
        return true;
    }

    /** 获取玩家可出的牌 */
    getPlayableCards(): Card[] {
        const currentPlayer = this.getCurrentPlayer();
        const topCard = this.getTopCard();
        if (!currentPlayer || !topCard) return [];

        return getPlayableCards(
            currentPlayer,
            topCard,
            topCard.draw2Count,
            topCard.draw4Count,
        );
    }

    /** 重置游戏 */
    reset(): void {
        this.actor?.send({ type: "RESET" });
        this.actor?.stop();
        this.actor = null;
        publishEvent({
            type: GameEventType.RESET_GAME,
            timestamp: Date.now(),
        });
    }

    /** 销毁实例 */
    destroy(): void {
        this.reset();
        this.aiManager.destroy();
        GameManager.instance = null;
    }
}
