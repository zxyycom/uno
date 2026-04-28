/**
 * UI管理器
 * 协调所有UI组件的初始化和事件订阅
 */

import { _decorator, Component, Node } from 'cc';

import { GameManager } from '../../core/machine/game-manager';
import {
    DiscardUpdatedPayload,
    eventBus,
    GameEventType,
} from '../../foundation/events';
import { Card, CardColor, TopCard } from '../../foundation/types/game.types';
import { DeckComponent } from './deck-component';
import { GameBoard } from './game-board';
import { GameMessage } from './game-message';
import { OtherPlayerHand } from './other-player-hand';
import { PlayerHand } from './player-hand';
import { PlayerIndicator } from './player-indicator';

const { ccclass, property } = _decorator;
const AI_DISPLAY_NAMES = ['小橘子', '阳光男孩', '酷盖'];

@ccclass('UIManager')
export class UIManager extends Component {
    @property
    public autoStartOnLoad: boolean = true;

    @property
    public playerCount: number = 1;

    @property
    public aiCount: number = 3;

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

    @property([OtherPlayerHand])
    public otherPlayerHands: OtherPlayerHand[] = [];

    private gameManager: GameManager | null = null;
    private currentTopCard: TopCard | null = null;

    start() {
        this.initEventSubscriptions();
        this.initUIComponents();
        if (this.autoStartOnLoad) {
            // Delay one frame so all UI components finish start() and subscribe first.
            this.scheduleOnce(() => {
                this.startNewGame();
            }, 0);
        }
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化UI层共享状态事件订阅 */
    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.currentTopCard = null;
            },
            this
        );

        eventBus.on(
            GameEventType.DISCARD_UPDATED,
            (payload) => {
                this.onDiscardUpdated(payload);
            },
            this
        );
    }

    /** 初始化UI组件 */
    private initUIComponents(): void {
        // 获取游戏管理器
        this.gameManager = GameManager.getInstance();

        // 初始化玩家手牌（人类玩家）
        if (this.playerHand) {
            this.playerHand.init('player_0', this);
        }

        for (let i = 0; i < this.otherPlayerHands.length; i++) {
            const hand = this.otherPlayerHands[i];
            hand.init(`ai_${i + 1}`);
        }

        // 初始化玩家指示器
        if (this.playerIndicators) {
            const indicators = this.playerIndicators.children;
            for (let i = 0; i < indicators.length; i++) {
                const indicator = indicators[i].getComponent(PlayerIndicator);
                if (indicator) {
                    const playerId = i === 0 ? 'player_0' : `ai_${i}`;
                    const playerName =
                        i === 0
                            ? '你'
                            : (AI_DISPLAY_NAMES[i - 1] ?? `AI玩家${i}`);
                    indicator.init(playerId, playerName);
                }
            }
        }
    }

    /** 开始新游戏 */
    public startNewGame(): void {
        if (this.gameManager) {
            this.gameManager.startGame(this.playerCount, this.aiCount);
        }
    }

    /** 提供给当前玩家手牌读取的顶牌信息，由 UIManager 通过事件维护 */
    public getTopCard(): TopCard | null {
        return this.currentTopCard;
    }

    /** 提供给当前玩家手牌触发出牌，统一由 UIManager 转发到游戏管理器 */
    public playCard(
        playerId: string,
        card: Card,
        chosenColor?: CardColor
    ): void {
        this.gameManager?.playCard(playerId, card, chosenColor);
    }

    /** 弃牌堆更新：同步 UI 层顶牌状态，并通知手牌刷新可出牌提示 */
    private onDiscardUpdated(payload: DiscardUpdatedPayload): void {
        this.currentTopCard = payload.topCardInfo;
        this.playerHand?.refreshPlayableCards(true);
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
