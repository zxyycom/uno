/**
 * UI管理器
 * 协调所有UI组件的初始化和事件订阅
 */

import { _decorator, Component, Node } from "cc";
import { GameManager } from "../machines/game-manager";
import { GameBoard } from "./game-board";
import { PlayerHand } from "./player-hand";
import { DeckComponent } from "./deck-component";
import { TimerComponent } from "./timer-component";
import { PlayerIndicator } from "./player-indicator";
import { GameMessage } from "./game-message";
import {
    GameEventType,
    GameEvent,
    subscribeEvent,
    TurnChangedEvent,
    HandUpdatedEvent,
    CurrentPlayerUpdatedEvent,
} from "../events/game.events";

const { ccclass, property } = _decorator;

@ccclass("UIManager")
export class UIManager extends Component {
    @property(GameBoard)
    public gameBoard: GameBoard | null = null;

    @property(PlayerHand)
    public playerHand: PlayerHand | null = null;

    @property(DeckComponent)
    public deckComponent: DeckComponent | null = null;

    @property(TimerComponent)
    public timerComponent: TimerComponent | null = null;

    @property(Node)
    public playerIndicators: Node | null = null;

    @property(GameMessage)
    public gameMessage: GameMessage | null = null;

    private gameManager: GameManager | null = null;
    private subscriptions: Array<() => void> = [];

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
            this.playerHand.init("player_0");
        }

        // 初始化计时器
        if (this.timerComponent) {
            this.timerComponent.onTimeout = () => {
                this.onTurnTimeout();
            };
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
        // 监听回合变化
        this.subscriptions.push(
            subscribeEvent(GameEventType.TURN_CHANGED, (event: GameEvent) => {
                const payload = (event as TurnChangedEvent).payload;
                this.onTurnChanged(payload);
            })
        );

        // 监听当前玩家更新
        this.subscriptions.push(
            subscribeEvent(GameEventType.CURRENT_PLAYER_UPDATED, (event: GameEvent) => {
                const payload = (event as CurrentPlayerUpdatedEvent).payload;
                this.updateActivePlayerIndicator(payload);
            })
        );

        // 监听手牌更新
        this.subscriptions.push(
            subscribeEvent(GameEventType.HAND_UPDATED, (event: GameEvent) => {
                const payload = (event as HandUpdatedEvent).payload;
                this.onHandUpdated(payload);
            })
        );
    }

    /** 处理回合变化 */
    private onTurnChanged(payload: TurnChangedEvent["payload"]): void {
        // 更新玩家指示器
        this.updateActivePlayerIndicator({
            playerId: payload.currentPlayerId,
            playerName: payload.currentPlayer.name,
            isHuman: payload.currentPlayer.type === "human",
        });
    }

    /** 更新当前玩家指示器 */
    private updateActivePlayerIndicator(payload: CurrentPlayerUpdatedEvent["payload"]): void {
        if (!this.playerIndicators) return;

        const indicators = this.playerIndicators.children;
        for (const node of indicators) {
            const indicator = node.getComponent(PlayerIndicator);
            if (indicator) {
                indicator.setActive(indicator.getPlayerId() === payload.playerId);
            }
        }
    }

    /** 处理手牌更新 */
    private onHandUpdated(payload: HandUpdatedEvent["payload"]): void {
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

    /** 回合超时处理 */
    private onTurnTimeout(): void {
        if (this.gameManager) {
            this.gameManager.drawCard();
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
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
