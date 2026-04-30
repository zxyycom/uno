/**
 * UI管理器
 * 协调所有UI组件的初始化和事件订阅
 */

import { _decorator, Component } from 'cc';

import { LocalPlayerProfile } from '../../client/local-player-profile';
import { GameManager } from '../../core/machine/game-manager';
import {
    DiscardUpdatedPayload,
    eventBus,
    GameEventType,
    StartGamePayload,
    TurnChangedPayload,
} from '../../foundation/events';
import {
    Card,
    CardColor,
    GamePlayerSetup,
    PlayerType,
    TopCard,
} from '../../foundation/types/game.types';
import { DeckComponent } from './deck-component';
import { GameMessage } from './game-message';
import { OtherPlayerHand } from './other-player-hand';
import { PlayerHand } from './player-hand';
import { PlayerIndicator } from './player-indicator';

const { ccclass, property } = _decorator;
const AI_DISPLAY_NAMES = ['小橘子', '阳光男孩', '酷盖'];

/**
 * 根据本地玩家ID和玩家列表推算方位绑定
 * @param players 排序后的玩家列表（按 seatIndex 升序）
 * @param localPlayerId 本地玩家ID
 * @returns 方位映射，bottom=本地玩家，right/top/left 分别为后1/2/3位
 */
export function calculateDirectionBinding(
    players: readonly GamePlayerSetup[],
    localPlayerId: string
): {
    bottom: string;
    right: string;
    top: string;
    left: string;
} {
    const localIndex = players.findIndex((p) => p.id === localPlayerId);
    const count = players.length;
    return {
        bottom: players[localIndex].id,
        right: players[(localIndex + 1) % count].id,
        top: players[(localIndex + 2) % count].id,
        left: players[(localIndex + 3) % count].id,
    };
}

@ccclass('UIManager')
export class UIManager extends Component {
    @property
    public autoStartOnLoad: boolean = true;

    @property(PlayerHand)
    public playerHand: PlayerHand = null!;

    @property(DeckComponent)
    public deckComponent: DeckComponent = null!;

    @property(GameMessage)
    public gameMessage: GameMessage = null!;

    // 方位绑定的玩家指示器
    @property(PlayerIndicator)
    public playerIndicatorBottom: PlayerIndicator = null!;

    @property(PlayerIndicator)
    public playerIndicatorRight: PlayerIndicator = null!;

    @property(PlayerIndicator)
    public playerIndicatorTop: PlayerIndicator = null!;

    @property(PlayerIndicator)
    public playerIndicatorLeft: PlayerIndicator = null!;

    // 方位绑定的其他玩家手牌
    @property(OtherPlayerHand)
    public otherPlayerHandRight: OtherPlayerHand = null!;

    @property(OtherPlayerHand)
    public otherPlayerHandTop: OtherPlayerHand = null!;

    @property(OtherPlayerHand)
    public otherPlayerHandLeft: OtherPlayerHand = null!;

    private gameManager: GameManager = null!;
    private currentTopCard: TopCard | null = null;

    // 方位绑定状态
    private localPlayerId: string = '';
    private playerIdByDirection: {
        bottom: string;
        right: string;
        top: string;
        left: string;
    } | null = null;

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
            (payload) => {
                this.currentTopCard = null;
                this.bindSeats(payload);
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

        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
            },
            this
        );
    }

    /**
     * 根据玩家座位结构和本地玩家ID绑定方位
     */
    private bindSeats(payload: StartGamePayload): void {
        const { players, localPlayerId } = payload;

        // 按 seatIndex 排序
        const sortedPlayers = [...players].sort(
            (a, b) => a.seatIndex - b.seatIndex
        );

        // 使用纯函数计算方位绑定
        const direction = calculateDirectionBinding(
            sortedPlayers,
            localPlayerId
        );

        this.localPlayerId = localPlayerId;
        this.playerIdByDirection = direction;

        // 绑定本地玩家手牌
        this.playerHand.init(this.localPlayerId, this);

        // 绑定其他玩家手牌
        const rightId = this.playerIdByDirection.right;
        const topId = this.playerIdByDirection.top;
        const leftId = this.playerIdByDirection.left;

        this.otherPlayerHandRight.init(rightId);
        this.otherPlayerHandTop.init(topId);
        this.otherPlayerHandLeft.init(leftId);

        // 获取AI玩家显示名称
        const getDisplayName = (player: GamePlayerSetup): string => {
            if (player.type === PlayerType.HUMAN) {
                return player.name;
            }
            // AI 玩家使用固定名称
            const aiIndex = sortedPlayers
                .filter((p) => p.type === PlayerType.AI)
                .findIndex((p) => p.id === player.id);
            return AI_DISPLAY_NAMES[aiIndex] ?? `AI玩家${aiIndex + 1}`;
        };

        // 绑定玩家指示器
        const bindIndicator = (
            indicator: PlayerIndicator,
            playerId: string
        ) => {
            const player = sortedPlayers.find((p) => p.id === playerId);
            if (player) {
                indicator.init(playerId, getDisplayName(player));
            }
        };

        bindIndicator(
            this.playerIndicatorBottom,
            this.playerIdByDirection.bottom
        );
        bindIndicator(
            this.playerIndicatorRight,
            this.playerIdByDirection.right
        );
        bindIndicator(this.playerIndicatorTop, this.playerIdByDirection.top);
        bindIndicator(this.playerIndicatorLeft, this.playerIdByDirection.left);
    }

    /** 处理回合变化 - 只更新高亮，不重新排座位 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        const currentId = payload.currentPlayer.id;

        const updateIndicator = (indicator: PlayerIndicator) => {
            indicator.setActive(indicator.getPlayerId() === currentId);
        };

        updateIndicator(this.playerIndicatorBottom);
        updateIndicator(this.playerIndicatorRight);
        updateIndicator(this.playerIndicatorTop);
        updateIndicator(this.playerIndicatorLeft);
    }

    /** 初始化UI组件 */
    private initUIComponents(): void {
        // 获取游戏管理器
        this.gameManager = GameManager.getInstance()!;
    }

    /** 开始新游戏 */
    public startNewGame(): void {
        const localProfile = LocalPlayerProfile.getInstance();
        const localPlayerId = localProfile.getLocalPlayerId();
        const localPlayerName = localProfile.getLocalPlayerName();

        // 构建 4 人玩家列表
        const players: GamePlayerSetup[] = [
            {
                id: localPlayerId,
                name: localPlayerName,
                type: PlayerType.HUMAN,
                seatIndex: 2, // 本地玩家 seatIndex=2，方便验证不是 player_0
            },
            {
                id: 'player_0',
                name: '玩家1',
                type: PlayerType.AI,
                seatIndex: 0,
            },
            {
                id: 'player_1',
                name: '玩家2',
                type: PlayerType.AI,
                seatIndex: 1,
            },
            {
                id: 'player_3',
                name: '玩家4',
                type: PlayerType.AI,
                seatIndex: 3,
            },
        ];

        this.gameManager.startGame(players, localPlayerId);
    }

    /** 提供给当前玩家手牌读取的顶牌信息，由 UIManager 通过事件维护 */
    public getTopCard(): TopCard {
        return this.currentTopCard!;
    }

    /** 提供给当前玩家手牌触发出牌，统一由 UIManager 转发到游戏管理器 */
    public playCard(
        playerId: string,
        card: Card,
        chosenColor?: CardColor
    ): void {
        this.gameManager.playCard(playerId, card, chosenColor);
    }

    /** 弃牌堆更新：同步 UI 层顶牌状态，并通知手牌刷新可出牌提示 */
    private onDiscardUpdated(payload: DiscardUpdatedPayload): void {
        this.currentTopCard = payload.topCardInfo;
        this.playerHand.refreshPlayableCards(true);
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
