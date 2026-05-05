/**
 * 手牌卡牌布局工具
 * 只处理节点排列的底层计算和 transform 应用，不包含玩家身份、牌面和交互逻辑。
 */

import { Node, RealCurve, tween, Vec3 } from 'cc';

export type CardLayoutTransform = {
    position: Vec3;
    angle: number;
    scale: Vec3;
    siblingIndex: number;
};

export type CurvedFanLayoutConfig = {
    expectedCardSpacing: number;
    maxStackWidth: number;
    placementCurve: RealCurve;
    placementCurveScale: number;
    fanAngle: number;
};

export function createDefaultPlacementCurve(): RealCurve {
    const curve = new RealCurve();
    curve.assignSorted([0, 1], [0, 0]);
    return curve;
}

/**
 * 计算曲线扇形手牌节点的 transform。
 * X 轴按中心间距展开，Y 轴由实数曲线采样，旋转按总扇形夹角均分。
 */
export function calculateCurvedFanCardLayouts(
    totalCards: number,
    config: CurvedFanLayoutConfig
): CardLayoutTransform[] {
    if (totalCards === 0) {
        return [];
    }

    const centers = calculateCurvedFanCenters(totalCards, config);
    const layouts: CardLayoutTransform[] = [];

    for (let i = 0; i < totalCards; i++) {
        const ratio = calculateLayoutRatio(i, totalCards);
        layouts.push({
            position: new Vec3(
                centers[i],
                config.placementCurve.evaluate(ratio) *
                    config.placementCurveScale,
                0
            ),
            angle: calculateFanCardAngle(i, totalCards, config.fanAngle),
            scale: new Vec3(1, 1, 1),
            siblingIndex: i,
        });
    }

    return layouts;
}

export function createCurvedFanLayoutSignature(
    totalCards: number,
    config: CurvedFanLayoutConfig
): string {
    return [
        totalCards,
        config.expectedCardSpacing,
        config.maxStackWidth,
        config.placementCurveScale,
        config.fanAngle,
        createRealCurveSignature(config.placementCurve),
    ].join('|');
}

export function applyCardLayoutTransform(
    node: Node,
    layout: CardLayoutTransform,
    animated: boolean,
    duration: number
): void {
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

function calculateCurvedFanCenters(
    totalCards: number,
    config: CurvedFanLayoutConfig
): number[] {
    const gapCount = totalCards - 1;
    const stackWidth = calculateStackWidth(gapCount, config);
    const step = gapCount === 0 ? 0 : stackWidth / gapCount;
    const firstCenter = -stackWidth / 2;
    const centers: number[] = [];

    for (let i = 0; i < totalCards; i++) {
        centers.push(firstCenter + step * i);
    }

    return centers;
}

function calculateStackWidth(
    gapCount: number,
    config: CurvedFanLayoutConfig
): number {
    if (gapCount === 0) {
        return 0;
    }

    const preferredWidth = config.expectedCardSpacing * gapCount;
    if (config.maxStackWidth <= 0) {
        return preferredWidth;
    }

    return Math.min(preferredWidth, config.maxStackWidth);
}

function calculateLayoutRatio(index: number, totalCards: number): number {
    if (totalCards === 1) {
        return 0.5;
    }

    return index / (totalCards - 1);
}

function calculateFanCardAngle(
    index: number,
    totalCards: number,
    fanAngle: number
): number {
    if (totalCards === 1) {
        return 0;
    }

    const ratio = calculateLayoutRatio(index, totalCards);
    return fanAngle / 2 - fanAngle * ratio;
}

function createRealCurveSignature(curve: RealCurve): string {
    const parts: string[] = [];
    for (let i = 0; i < curve.keyFramesCount; i++) {
        const value = curve.getKeyframeValue(i);
        parts.push(
            [
                curve.getKeyframeTime(i),
                value.value,
                value.interpolationMode,
                value.leftTangent,
                value.rightTangent,
                value.leftTangentWeight,
                value.rightTangentWeight,
                value.tangentWeightMode,
            ].join(',')
        );
    }

    return parts.join(';');
}
