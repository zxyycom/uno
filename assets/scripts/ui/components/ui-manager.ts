/**
 * UI管理器
 * 协调所有UI组件的初始化和事件订阅
 */

import { _decorator, Component, Node } from 'cc';

import { LocalPlayerProfile } from '../../client/local-player-profile';
import { GameManager } from '../../core/machine/game-manager';
import {
    DiscardUpdatedPayload,
    eventBus,
    GameEventType,
    StartGamePayload,
} from '../../foundation/events';
import {
    Card,
    CardColor,
    GamePlayerSetup,
    PlayerType,
    TopCard,
} from '../../foundation/types/game.types';
import {
    CardMoveAnimationConfig,
    CardMoveContext,
    DEFAULT_CARD_MOVE_ANIMATION_CONFIG,
} from '../utils/card-move-animation';
import {
    calculateDirectionBinding,
    PlayerIdByDirection,
} from '../utils/seat-direction';
import { CardMoveAnimator } from './card-move-animator';
import { DeckComponent } from './deck-component';
import { OtherPlayerHand } from './other-player-hand';
import { PlayedCardPile } from './played-card-pile';
import { PlayerHand } from './player-hand';
import { PlayerSlotController } from './player-slot-controller';

const { ccclass, property } = _decorator;
const AI_DISPLAY_NAMES = ['小橘子', '阳光男孩', '酷盖'];

@ccclass('UIManager')
export class UIManager extends Component {
    @property
    public autoStartOnLoad: boolean = true;

    @property(PlayerHand)
    public playerHand: PlayerHand = null!;

    @property(DeckComponent)
    public deckComponent: DeckComponent = null!;

    @property(CardMoveAnimator)
    public cardMoveAnimator: CardMoveAnimator = null!;

    @property(Node)
    public deckNode: Node = null!;

    @property(Node)
    public discardPileNode: Node = null!;

    @property(Node)
    public discardStackLayerNode: Node = null!;

    @property(PlayedCardPile)
    public playedCardPile: PlayedCardPile = null!;

    // 方位绑定的玩家槽位控制器
    @property(PlayerSlotController)
    public playerSlotBottom: PlayerSlotController = null!;

    @property(PlayerSlotController)
    public playerSlotRight: PlayerSlotController = null!;

    @property(PlayerSlotController)
    public playerSlotTop: PlayerSlotController = null!;

    @property(PlayerSlotController)
    public playerSlotLeft: PlayerSlotController = null!;

    // 方位绑定的其他玩家手牌
    @property(OtherPlayerHand)
    public otherPlayerHandRight: OtherPlayerHand = null!;

    @property(OtherPlayerHand)
    public otherPlayerHandTop: OtherPlayerHand = null!;

    @property(OtherPlayerHand)
    public otherPlayerHandLeft: OtherPlayerHand = null!;

    private static instance: UIManager | null = null;

    private gameManager: GameManager = null!;
    private currentTopCard: TopCard | null = null;
    public readonly animationConfig: CardMoveAnimationConfig = {
        ...DEFAULT_CARD_MOVE_ANIMATION_CONFIG,
    };

    // 方位绑定状态
    private localPlayerId: string = '';
    private playerIdByDirection: PlayerIdByDirection | null = null;

    onLoad() {
        UIManager.instance = this;
    }

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
        if (UIManager.instance === this) {
            UIManager.instance = null;
        }
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
        const playersById = new Map(
            sortedPlayers.map((player) => [player.id, player])
        );

        // 使用纯函数计算方位绑定
        const direction = calculateDirectionBinding(
            sortedPlayers,
            localPlayerId
        );

        this.localPlayerId = localPlayerId;
        this.playerIdByDirection = direction;

        // 绑定本地玩家手牌
        const cardMoveContext = this.createCardMoveContext();
        this.playerHand.init(this.localPlayerId, {
            ...cardMoveContext,
            getTopCard: () => this.getTopCard(),
            playCard: (playerId, card, chosenColor) => {
                this.playCard(playerId, card, chosenColor);
            },
        });

        // 绑定其他玩家手牌
        const rightId = this.playerIdByDirection.right;
        const topId = this.playerIdByDirection.top;
        const leftId = this.playerIdByDirection.left;

        this.otherPlayerHandRight.init(rightId, cardMoveContext);
        this.otherPlayerHandTop.init(topId, cardMoveContext);
        this.otherPlayerHandLeft.init(leftId, cardMoveContext);

        // 获取AI玩家显示名称
        const getDisplayName = (player: GamePlayerSetup): string => {
            if (player.type === PlayerType.HUMAN) {
                return player.name;
            }
            const aiIndex = sortedPlayers
                .filter((p) => p.type === PlayerType.AI)
                .findIndex((p) => p.id === player.id);
            return AI_DISPLAY_NAMES[aiIndex] ?? `AI玩家${aiIndex + 1}`;
        };

        // 绑定玩家槽位控制器
        const bindSlot = (
            controller: PlayerSlotController,
            playerId: string,
            dir: 'bottom' | 'right' | 'top' | 'left'
        ) => {
            const player = playersById.get(playerId)!;
            const isLocal = playerId === localPlayerId;
            controller.initSlot(playerId, getDisplayName(player), isLocal, dir);
        };

        bindSlot(
            this.playerSlotBottom,
            this.playerIdByDirection.bottom,
            'bottom'
        );
        bindSlot(this.playerSlotRight, this.playerIdByDirection.right, 'right');
        bindSlot(this.playerSlotTop, this.playerIdByDirection.top, 'top');
        bindSlot(this.playerSlotLeft, this.playerIdByDirection.left, 'left');
    }

    /** 初始化UI组件 */
    private initUIComponents(): void {
        // 获取游戏管理器
        this.gameManager = GameManager.getInstance()!;
        this.cardMoveAnimator.initialize(this.animationConfig);
    }

    private createCardMoveContext(): CardMoveContext {
        return {
            animator: this.cardMoveAnimator,
            deckNode: this.deckNode,
            discardPileNode: this.discardPileNode,
            discardStackLayerNode: this.discardStackLayerNode,
            acceptDiscardNode: (card, node) => {
                this.playedCardPile.acceptDiscardNode(card, node);
            },
            animationConfig: this.animationConfig,
        };
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

    static getInstance(): UIManager | null {
        return UIManager.instance;
    }
}
