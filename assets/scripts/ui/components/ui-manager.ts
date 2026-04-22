/**
 * UI管理器
 * 协调所有UI组件的初始化和事件订阅
 */

import { _decorator, Component, Node } from 'cc';

import { GameManager } from '../../core/machine/game-manager';
import {
    CurrentPlayerUpdatedPayload,
    eventBus,
    GameEventType,
    HandUpdatedPayload,
    TurnChangedPayload,
} from '../../foundation/events';
import { DeckComponent } from './deck-component';
import { GameBoard } from './game-board';
import { GameMessage } from './game-message';
import { PlayerHand } from './player-hand';
import { PlayerIndicator } from './player-indicator';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    @property(GameBoard)
    public gameBoard: GameBoard | null = null;

    @property(PlayerHand)
    public playerHand: PlayerHand | null = null;

    @property(DeckComponent)
    public deckComponent: DeckComponent | null = null;

    @property(Node)
    public playerIndicators: Node | null = null;

    @property(GameMessage)
    public gameMessage: GameMessage | null = null;

    private gameManager: GameManager | null = null;

    start() {
        this.initUIComponents();
        this.initGameEvents();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化UI组件 */
    private initUIComponents(): void {
        // 获取游戏管理器
        this.gameManager = GameManager.getInstance();

        // 初始化玩家手牌（人类玩家）
        if (this.playerHand) {
            this.playerHand.init('player_0');
        }

        // 初始化玩家指示器
        if (this.playerIndicators) {
            const indicators = this.playerIndicators.children;
            for (let i = 0; i < indicators.length; i++) {
                const indicator = indicators[i].getComponent(PlayerIndicator);
                if (indicator) {
                    indicator.init(`player_${i}`, `玩家 ${i}`);
                }
            }
        }
    }

    /** 初始化游戏事件订阅 */
    private initGameEvents(): void {
        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.CURRENT_PLAYER_UPDATED,
            (payload) => {
                this.updateActivePlayerIndicator(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.HAND_UPDATED,
            (payload) => {
                this.onHandUpdated(payload);
            },
            this
        );
    }

    /** 处理回合变化 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        // 更新玩家指示器
        this.updateActivePlayerIndicator({
            player: payload.currentPlayer,
        });
    }

    /** 更新当前玩家指示器 */
    private updateActivePlayerIndicator(
        payload: CurrentPlayerUpdatedPayload
    ): void {
        if (!this.playerIndicators) return;

        const indicators = this.playerIndicators.children;
        for (const node of indicators) {
            const indicator = node.getComponent(PlayerIndicator);
            if (indicator) {
                indicator.setActive(
                    indicator.getPlayerId() === payload.player.id
                );
            }
        }
    }

    /** 处理手牌更新 */
    private onHandUpdated(payload: HandUpdatedPayload): void {
        // 更新对应玩家的指示器
        if (!this.playerIndicators) return;

        const indicators = this.playerIndicators.children;
        for (const node of indicators) {
            const indicator = node.getComponent(PlayerIndicator);
            if (indicator && indicator.getPlayerId() === payload.playerId) {
                indicator.updateCardCount(payload.cardCount);
            }
        }
    }

    /** 开始新游戏 */
    public startNewGame(): void {
        if (this.gameManager) {
            this.gameManager.startGame(1, 1);
        }
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
