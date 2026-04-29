/**
 * AI自动响应组件
 * 挂载到场景后监听回合变化，在轮到 AI 玩家时自动出牌或摸牌。
 */

import { _decorator, Component } from 'cc';

import { GameManager } from '../../core/machine/game-manager';
import { AIManager } from '../../core/utils/ai-manager';
import {
    eventBus,
    GameEventType,
    StartGamePayload,
    TurnChangedPayload,
} from '../../foundation/events';
import {
    DEFAULT_GAME_CONFIG,
    GameConfig,
    PlayerType,
} from '../../foundation/types/game.types';

const { ccclass, property } = _decorator;

@ccclass('AIAutoResponder')
export class AIAutoResponder extends Component {
    @property
    public aiThinkDelay: number = DEFAULT_GAME_CONFIG.aiThinkDelay;

    private gameManager: GameManager | null = null;
    private aiManager: AIManager | null = null;

    start() {
        this.gameManager = GameManager.getInstance();
        this.aiManager = new AIManager(this.createConfig(DEFAULT_GAME_CONFIG));
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            (payload) => {
                this.onStartGame(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.GAME_OVER,
            () => {
                this.cancelPendingDecision();
            },
            this
        );
    }

    private onStartGame(payload: StartGamePayload): void {
        this.cancelPendingDecision();
        const aiManager = this.aiManager;
        if (!aiManager) {
            return;
        }

        // 从玩家列表中统计 AI 数量
        const aiCount = payload.players.filter(
            (p) => p.type === PlayerType.AI
        ).length;
        const config = this.createConfig({
            ...DEFAULT_GAME_CONFIG,
            playerCount: payload.players.length,
            aiCount,
        });
        aiManager.updateConfig(config);
    }

    private onTurnChanged(payload: TurnChangedPayload): void {
        this.cancelPendingDecision();

        if (payload.currentPlayer.type !== PlayerType.AI) {
            return;
        }

        const gameManager = this.gameManager;
        const aiManager = this.aiManager;
        if (!gameManager || !aiManager) {
            return;
        }

        const topCard = gameManager.getTopCard();
        if (!topCard) {
            return;
        }

        const playerId = payload.currentPlayer.id;
        aiManager.requestAIDecision(
            payload.currentPlayer,
            topCard,
            (action) => {
                const currentPlayer = gameManager.getCurrentPlayer();
                if (!currentPlayer || currentPlayer.id !== playerId) {
                    return;
                }

                if (action.action === 'draw') {
                    gameManager.drawCard(playerId);
                    return;
                }

                gameManager.playCard(playerId, action.card, action.chosenColor);
            }
        );
    }

    private cancelPendingDecision(): void {
        if (this.aiManager) {
            this.aiManager.cancelAIThink();
        }
    }

    private createConfig(baseConfig: GameConfig): GameConfig {
        return {
            ...baseConfig,
            aiThinkDelay: this.aiThinkDelay,
        };
    }

    public dispose(): void {
        this.cancelPendingDecision();
        eventBus.targetOff(this);
    }
}
