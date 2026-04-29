/**
 * 其他玩家手牌 UI 组件
 * 只展示卡背和数量，不展示真实牌面，不提供交互。
 *
 * 布局算法：
 * - 基于单卡中心预期间距与最大牌堆宽度计算 X 轴展开
 * - 当预期总宽度超过最大牌堆宽度时，自动压缩中心间距
 * - 使用实数曲线控制 Y 轴偏移，并按总扇形夹角均匀旋转
 */

import {
    _decorator,
    Component,
    Node,
    RealCurve,
    Sprite,
    SpriteFrame,
} from 'cc';

import { loadCardBackSprite } from '../../core/deck/deck-resources';
import {
    eventBus,
    GameEventType,
    HandUpdatedPayload,
} from '../../foundation/events';
import {
    applyCardLayoutTransform,
    calculateCurvedFanCardLayouts,
    CardLayoutTransform,
    createCurvedFanLayoutSignature,
    createDefaultPlacementCurve,
    CurvedFanLayoutConfig,
} from '../utils/hand-card-layout';
import { CardNodePool } from './card-node-pool';

const { ccclass, property } = _decorator;

const OTHER_PLAYER_HAND_LAYOUT_GROUP = {
    name: 'Layout',
    id: 'other-player-hand-layout',
    displayOrder: 10,
};

const OTHER_PLAYER_HAND_BINDINGS_GROUP = {
    name: 'Bindings',
    id: 'other-player-hand-bindings',
    displayOrder: 20,
};

@ccclass('OtherPlayerHand')
export class OtherPlayerHand extends Component {
    @property({
        type: CardNodePool,
        tooltip: '卡牌节点对象池，必须在编辑器中绑定',
        group: OTHER_PLAYER_HAND_BINDINGS_GROUP,
    })
    public cardNodePool!: CardNodePool;

    @property({
        tooltip: '单张卡牌中心点预期间距；未超过最大宽度时直接使用该间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public expectedCardSpacing: number = 96;

    @property({
        tooltip: '牌堆最大展开宽度；超过时按该宽度压缩中心间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public maxStackWidth: number = 420;

    @property({
        type: RealCurve,
        tooltip:
            '卡牌沿 X 轴展开时的 Y 轴偏移曲线；输入范围为 0 到 1，输出为本地坐标像素',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public placementCurve: RealCurve = createDefaultPlacementCurve();

    @property({
        tooltip: '实数曲线输出倍率；曲线为 -1 到 1 时，最终 Y 偏移为该倍率范围',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public placementCurveScale: number = 80;

    @property({
        tooltip: '总扇形夹角（度）；首张和最后一张卡牌的角度差等于该值',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public fanAngle: number = 0;

    @property({
        tooltip: '布局动画时长（秒）',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public layoutTweenDuration: number = 0.12;

    private playerId: string = '';
    private readonly cardNodes: Node[] = [];
    private cardBackSprite: SpriteFrame = null!;
    private cardBackLoadingPromise: Promise<void> | null = null;
    private layoutSignature: string = '';

    update(_dt: number): void {
        this.refreshCurvedFanLayoutIfChanged(false);
    }

    public init(playerId: string): void {
        this.playerId = playerId;
        this.renderCardBacks(0, false);
    }

    start() {
        this.initEventSubscriptions();
        void this.ensureCardBackLoaded();
    }

    onDestroy() {
        this.dispose();
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.renderCardBacks(0, false);
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

    private onHandUpdated(payload: HandUpdatedPayload): void {
        if (payload.playerId !== this.playerId) {
            return;
        }

        this.renderCardBacks(payload.cardCount, true);
    }

    private renderCardBacks(count: number, animated: boolean): void {
        this.syncCardNodes(count);
        this.refreshCurvedFanLayout(animated);
    }

    private syncCardNodes(targetCount: number): void {
        while (this.cardNodes.length < targetCount) {
            const node = this.createCardBackNode();
            this.cardNodes.push(node);
        }

        while (this.cardNodes.length > targetCount) {
            const node = this.cardNodes.pop()!;
            this.cardNodePool.release(node);
        }
    }

    private createCardBackNode(): Node {
        const node = this.cardNodePool.acquire(this.node);
        node.active = true;
        node.setSiblingIndex(this.cardNodes.length);

        if (this.cardBackSprite) {
            this.applyCardBackSprite(node);
        } else {
            void this.ensureCardBackLoaded();
        }

        return node;
    }

    private async ensureCardBackLoaded(): Promise<void> {
        if (this.cardBackSprite) {
            return;
        }
        if (this.cardBackLoadingPromise) {
            return this.cardBackLoadingPromise;
        }

        this.cardBackLoadingPromise = loadCardBackSprite()
            .then((spriteFrame) => {
                this.cardBackSprite = spriteFrame!;
                this.applyCardBackSpriteToAllNodes();
            })
            .finally(() => {
                this.cardBackLoadingPromise = null;
            });

        return this.cardBackLoadingPromise;
    }

    private applyCardBackSpriteToAllNodes(): void {
        for (const node of this.cardNodes) {
            this.applyCardBackSprite(node);
        }
    }

    private applyCardBackSprite(node: Node): void {
        const sprite = node.getComponent(Sprite)!;
        sprite.spriteFrame = this.cardBackSprite;
    }

    private refreshCurvedFanLayoutIfChanged(animated: boolean): void {
        const nextSignature = this.getLayoutSignature();
        if (nextSignature === this.layoutSignature) {
            return;
        }
        this.refreshCurvedFanLayout(animated);
    }

    private refreshCurvedFanLayout(animated: boolean): void {
        const layouts = calculateCurvedFanCardLayouts(
            this.cardNodes.length,
            this.getCurvedFanLayoutConfig()
        );

        for (let i = 0; i < layouts.length; i++) {
            const node = this.cardNodes[i];
            const layout = layouts[i];
            this.applyCardLayout(node, layout, animated);
        }

        this.layoutSignature = this.getLayoutSignature();
    }

    private applyCardLayout(
        node: Node,
        layout: CardLayoutTransform,
        animated: boolean
    ): void {
        applyCardLayoutTransform(
            node,
            layout,
            animated,
            this.layoutTweenDuration
        );
    }

    private getCurvedFanLayoutConfig(): CurvedFanLayoutConfig {
        return {
            expectedCardSpacing: this.expectedCardSpacing,
            maxStackWidth: this.maxStackWidth,
            placementCurve: this.placementCurve,
            placementCurveScale: this.placementCurveScale,
            fanAngle: this.fanAngle,
        };
    }

    private getLayoutSignature(): string {
        return createCurvedFanLayoutSignature(
            this.cardNodes.length,
            this.getCurvedFanLayoutConfig()
        );
    }

    private clearCards(): void {
        while (this.cardNodes.length > 0) {
            const node = this.cardNodes.pop()!;
            this.cardNodePool.release(node);
        }
    }

    public dispose(): void {
        eventBus.targetOff(this);
        this.clearCards();
    }
}
