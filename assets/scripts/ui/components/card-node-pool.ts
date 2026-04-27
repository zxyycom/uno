/**
 * 卡牌节点对象池组件
 * 负责复用卡牌 UI 节点，避免手牌频繁刷新时反复 instantiate/destroy。
 */

import {
    _decorator,
    Component,
    instantiate,
    Node,
    NodePool,
    Prefab,
    Sprite,
    Tween,
    UIOpacity,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CardNodePool')
export class CardNodePool extends Component {
    /** 卡牌节点预制体，必须在编辑器中配置 */
    @property({
        type: Prefab,
        tooltip: '卡牌节点预制体，必须在编辑器中配置',
    })
    public cardPrefab!: Prefab;

    /** 启动时预创建的卡牌节点数量，用于减少首次发牌卡顿 */
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

    onLoad() {
        this.prewarm();
    }

    onDestroy() {
        this.clear();
    }

    /** 从对象池取出卡牌节点；池为空时才创建新节点 */
    public acquire(parent: Node): Node {
        const cardNode =
            this.pool.size() > 0 ? this.pool.get()! : this.create();
        cardNode.setParent(parent);
        cardNode.active = true;
        this.resetNode(cardNode);
        return cardNode;
    }

    /** 归还卡牌节点；池满时销毁，避免无限占用内存 */
    public release(cardNode: Node): void {
        Tween.stopAllByTarget(cardNode);
        cardNode.removeFromParent();
        cardNode.active = false;
        this.resetNode(cardNode);

        if (!this.isValid) {
            return;
        }

        if (this.pool.size() >= this.getMaxRetainedNodes()) {
            cardNode.destroy();
            return;
        }

        this.pool.put(cardNode);
    }

    /** 清空对象池内缓存节点 */
    public clear(): void {
        this.pool.clear();
    }

    /** 预热对象池，提前创建常用数量的节点 */
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

    /** 重置节点基础表现，避免上一张牌的动画状态污染下一张牌 */
    private resetNode(cardNode: Node): void {
        if (!cardNode || !cardNode.isValid) {
            return;
        }

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

    /** 获取有效池容量，编辑器误填负数时按 0 处理 */
    private getMaxRetainedNodes(): number {
        return Math.max(Math.floor(this.maxRetainedNodes), 0);
    }
}
