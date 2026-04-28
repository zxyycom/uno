/**
 * 手牌卡牌布局工具
 * 只处理节点排列的底层计算和 transform 应用，不包含玩家身份、牌面和交互逻辑。
 */

import { Node, tween, Tween, UIOpacity, Vec3 } from 'cc';

export type CardLayoutTransform = {
    position: Vec3;
    angle: number;
    scale: Vec3;
    siblingIndex: number;
    opacity?: number;
};

export type FlatLineLayoutConfig = {
    cardWidth: number;
    preferredGap: number;
    minGap: number;
    maxLineWidth: number;
    lineAngle: number;
};

/**
 * 计算平铺手牌节点的 transform。
 * 适用于卡背、紧凑手牌等无需扇形抬升的排列。
 */
export function calculateFlatLineCardLayouts(
    totalCards: number,
    config: FlatLineLayoutConfig
): CardLayoutTransform[] {
    if (totalCards === 0) {
        return [];
    }

    const centers = calculateFlatLineCenters(totalCards, config);
    const direction = calculateLineDirection(config.lineAngle);
    const layouts: CardLayoutTransform[] = [];

    for (let i = 0; i < totalCards; i++) {
        layouts.push({
            position: new Vec3(
                direction.x * centers[i],
                direction.y * centers[i],
                0
            ),
            angle: 0,
            scale: new Vec3(1, 1, 1),
            siblingIndex: i,
        });
    }

    return layouts;
}

export function createFlatLineLayoutSignature(
    totalCards: number,
    config: FlatLineLayoutConfig
): string {
    return [
        totalCards,
        config.cardWidth,
        config.preferredGap,
        config.minGap,
        config.maxLineWidth,
        config.lineAngle,
    ].join('|');
}

export function applyCardLayoutTransform(
    node: Node,
    layout: CardLayoutTransform,
    animated: boolean,
    duration: number
): void {
    applyOpacity(node, layout);

    Tween.stopAllByTarget(node);
    if (animated) {
        tween(node)
            .to(duration, {
                position: layout.position,
                angle: layout.angle,
                scale: layout.scale,
            })
            .start();
    } else {
        node.setPosition(layout.position);
        node.angle = layout.angle;
        node.setScale(layout.scale);
    }

    node.setSiblingIndex(layout.siblingIndex);
}

function calculateFlatLineCenters(
    totalCards: number,
    config: FlatLineLayoutConfig
): number[] {
    const gapCount = totalCards - 1;
    const cardsWidth = totalCards * config.cardWidth;
    let gap = config.preferredGap;

    if (gapCount > 0 && config.maxLineWidth > 0) {
        const maxGap = (config.maxLineWidth - cardsWidth) / gapCount;
        gap = Math.min(gap, maxGap);
    }
    gap = Math.max(gap, config.minGap);

    const lineWidth = cardsWidth + gap * gapCount;
    const firstCenter = -lineWidth / 2 + config.cardWidth / 2;
    const step = config.cardWidth + gap;
    const centers: number[] = [];

    for (let i = 0; i < totalCards; i++) {
        centers.push(firstCenter + step * i);
    }

    return centers;
}

function calculateLineDirection(lineAngle: number): Vec3 {
    const radian = (lineAngle * Math.PI) / 180;
    const x = Math.cos(radian);
    const y = Math.sin(radian);
    const length = Math.hypot(x, y);

    return new Vec3(x / length, y / length, 0);
}

function applyOpacity(node: Node, layout: CardLayoutTransform): void {
    if (typeof layout.opacity !== 'number') {
        return;
    }

    const opacity = ensureOpacity(node);
    opacity.opacity = layout.opacity;
}

function ensureOpacity(node: Node): UIOpacity {
    const opacity = node.getComponent(UIOpacity);
    if (opacity) {
        return opacity;
    }
    return node.addComponent(UIOpacity);
}
