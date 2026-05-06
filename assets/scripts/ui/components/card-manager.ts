/**
 * 卡牌管理器组件
 * 统一管理卡牌节点的创建、资源加载和回收。
 * 提供单一入口获取带卡面信息的卡牌节点，无需手动初始化和加载资源。
 */

import {
    _decorator,
    Component,
    instantiate,
    Node,
    NodePool,
    Prefab,
    Sprite,
    SpriteFrame,
    Tween,
    UIOpacity,
} from 'cc';

import { Card } from '../../foundation/types/game.types';
import {
    loadCardBackSprite,
    loadCardSprite,
} from '../resources/card-sprite-loader';

const { ccclass, property } = _decorator;

@ccclass('CardManager')
export class CardManager extends Component {
    /** 卡牌节点预制体，必须在编辑器中配置 */
    @property({
        type: Prefab,
        tooltip: '卡牌节点预制体，必须在编辑器中配置',
    })
    public cardPrefab!: Prefab;

    /** 启动时预创建的卡牌节点数量 */
    @property({
        tooltip: '启动时预创建的卡牌节点数量，用于减少首次发牌卡顿',
    })
    public initialSize: number = 16;

    /** 对象池最多保留的节点数量，超过后归还节点会直接销毁 */
    @property({
        tooltip: '对象池最多保留的节点数量，超过后归还节点会直接销毁',
    })
    public maxRetainedNodes: number = 40;

    private readonly pool = new NodePool();
    private readonly spriteLoadVersions = new WeakMap<Node, number>();
    private cardBackSpriteFrame: SpriteFrame | null = null;

    onLoad() {
        this.prewarm();
        void this.loadCardBack();
    }

    onDestroy() {
        this.clear();
    }

    /**
     * 获取一张卡牌节点，节点已绑定卡牌图片。
     * @param card 卡牌数据
     * @param parent 父节点
     * @returns 卡牌节点（已设置好卡面 Sprite）
     */
    public async acquireCard(card: Card, parent: Node): Promise<Node> {
        const cardNode = this.acquireNode();
        this.resetNode(cardNode);
        cardNode.setParent(parent);
        cardNode.active = true;
        await this.setCardFace(cardNode, card);

        return cardNode;
    }

    /**
     * 获取一张卡背节点（同步返回，图片异步加载）。
     * @param parent 父节点
     * @returns 卡背节点
     */
    public acquireCardBack(parent: Node): Node {
        const cardNode = this.acquireNode();
        this.resetNode(cardNode);
        cardNode.setParent(parent);
        cardNode.active = true;
        this.setCardBack(cardNode);

        return cardNode;
    }

    /**
     * 将已有卡牌节点切换为真实牌面。
     * @param cardNode 卡牌节点
     * @param card 卡牌数据
     */
    public async setCardFace(cardNode: Node, card: Card): Promise<void> {
        const loadVersion = this.nextSpriteLoadVersion(cardNode);
        const spriteFrame = await loadCardSprite(card);
        if (!spriteFrame || !this.canApplySpriteFrame(cardNode, loadVersion)) {
            return;
        }

        const sprite = cardNode.getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = spriteFrame;
        }
    }

    /**
     * 将已有卡牌节点切换为卡背。
     * @param cardNode 卡牌节点
     */
    public setCardBack(cardNode: Node): void {
        const loadVersion = this.nextSpriteLoadVersion(cardNode);
        const sprite = cardNode.getComponent(Sprite);
        if (!sprite) {
            return;
        }

        if (this.cardBackSpriteFrame) {
            sprite.spriteFrame = this.cardBackSpriteFrame;
            return;
        }

        void loadCardBackSprite().then((spriteFrame) => {
            if (
                !spriteFrame ||
                !this.canApplySpriteFrame(cardNode, loadVersion)
            ) {
                return;
            }

            this.cardBackSpriteFrame = spriteFrame;

            const currentSprite = cardNode.getComponent(Sprite);
            if (currentSprite) {
                currentSprite.spriteFrame = spriteFrame;
            }
        });
    }

    /**
     * 归还卡牌节点到池中。
     * @param cardNode 要归还的节点
     */
    public releaseCard(cardNode: Node): void {
        this.resetNode(cardNode);

        if (!this.node || !this.node.isValid) {
            return;
        }

        if (this.pool.size() >= this.getMaxRetainedNodes()) {
            cardNode.destroy();
            return;
        }

        this.pool.put(cardNode);
    }

    /** 清空对象池 */
    public clear(): void {
        this.pool.clear();
    }

    /** 预热对象池 */
    private prewarm(): void {
        const count = Math.max(Math.floor(this.initialSize), 0);
        for (let i = 0; i < count; i++) {
            const cardNode = this.create();
            cardNode.active = false;
            this.pool.put(cardNode);
        }
    }

    /** 创建单个卡牌节点 */
    private create(): Node {
        return instantiate(this.cardPrefab);
    }

    /** 从池中获取节点，池为空则创建新节点 */
    private acquireNode(): Node {
        const cardNode =
            this.pool.size() > 0 ? this.pool.get()! : this.create();
        return cardNode;
    }

    /** 重置节点基础状态 */
    private resetNode(cardNode: Node): void {
        if (!cardNode.isValid) {
            return;
        }

        this.nextSpriteLoadVersion(cardNode);
        Tween.stopAllByTarget(cardNode);
        cardNode.removeFromParent();
        cardNode.active = false;
        cardNode.setPosition(0, 0, 0);
        cardNode.setScale(1, 1, 1);
        cardNode.angle = 0;

        const sprites = cardNode.getComponentsInChildren(Sprite);
        for (const sprite of sprites) {
            sprite.spriteFrame = null;
        }

        const opacity = cardNode.getComponent(UIOpacity);
        if (opacity) {
            opacity.opacity = 255;
        }
    }

    /** 递增节点贴图加载版本，防止旧异步回调污染复用节点 */
    private nextSpriteLoadVersion(cardNode: Node): number {
        const nextVersion = (this.spriteLoadVersions.get(cardNode) ?? 0) + 1;
        this.spriteLoadVersions.set(cardNode, nextVersion);
        return nextVersion;
    }

    /** 判断异步加载结果是否仍可应用到当前节点 */
    private canApplySpriteFrame(cardNode: Node, loadVersion: number): boolean {
        return (
            cardNode.isValid &&
            this.spriteLoadVersions.get(cardNode) === loadVersion
        );
    }

    /** 预加载卡背图片 */
    private async loadCardBack(): Promise<void> {
        this.cardBackSpriteFrame = await loadCardBackSprite();
    }

    /** 获取有效池容量 */
    private getMaxRetainedNodes(): number {
        return Math.max(Math.floor(this.maxRetainedNodes), 0);
    }
}
