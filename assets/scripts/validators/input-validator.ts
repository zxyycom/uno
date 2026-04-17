/**
 * 玩家输入校验器
 * 负责校验玩家出牌是否符合规则
 */

import { Card, Player, TopCard, UnoCardType } from '../types/game.types';

/** 校验结果 */
export interface ValidationResult {
    valid: boolean;
    error?: ValidationError;
}

/** 校验错误类型 */
export type ValidationError =
    | 'NOT_CURRENT_PLAYER'
    | 'PLAYER_NOT_FOUND'
    | 'CARD_NOT_IN_HAND'
    | 'WILD_DRAW4_MUST_MATCH_COLOR'
    | 'WILD_DRAW4_NO_SAME_COLOR_CARD'
    | 'MUST_PLAY_DRAW2'
    | 'MUST_PLAY_DRAW4'
    | 'COLOR_MISMATCH'
    | 'COLOR_AND_VALUE_MISMATCH';

/** 校验玩家输入的基础条件 */
export function validatePlayerInput(
    playerId: string,
    currentPlayerId: string,
    player: Player | undefined
): ValidationResult {
    if (playerId !== currentPlayerId) {
        return { valid: false, error: 'NOT_CURRENT_PLAYER' };
    }
    if (!player) {
        return { valid: false, error: 'PLAYER_NOT_FOUND' };
    }
    return { valid: true };
}

/** 校验卡牌是否在玩家手牌中 */
export function validateCardInHand(
    cardId: string,
    player: Player
): ValidationResult {
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
        return { valid: false, error: 'CARD_NOT_IN_HAND' };
    }
    return { valid: true };
}

/**
 * 校验WildDraw4是否满足无同色可出条件
 */
export function canPlayWildDraw4(player: Player, topCard: TopCard): boolean {
    const activeColor = topCard.activeColor;

    for (const card of player.hand) {
        if (card.type === UnoCardType.WILD_DRAW_4) continue;
        if (card.type === UnoCardType.WILD) return true;
        if (card.color === activeColor) return true;
        if (
            card.type === UnoCardType.NUMBER &&
            topCard.card.type === UnoCardType.NUMBER &&
            card.value === topCard.card.value
        ) {
            return true;
        }
    }
    return false;
}

/** 校验卡牌是否可以打出 */
export function validateCanPlayCard(
    card: Card,
    topCard: TopCard,
    pendingDraw2Count: number,
    pendingDraw4Count: number
): ValidationResult {
    if (card.type === UnoCardType.WILD) {
        return { valid: true };
    }

    if (card.type === UnoCardType.WILD_DRAW_4) {
        if (pendingDraw4Count > 0) {
            return { valid: true };
        }
        return { valid: true };
    }

    if (pendingDraw2Count > 0) {
        if (card.type !== UnoCardType.DRAW_2) {
            return { valid: false, error: 'MUST_PLAY_DRAW2' };
        }
    }

    if (pendingDraw4Count > 0) {
        if (card.type !== UnoCardType.WILD_DRAW_4) {
            return { valid: false, error: 'MUST_PLAY_DRAW4' };
        }
    }

    if (card.color !== topCard.activeColor) {
        if (
            card.type === UnoCardType.NUMBER &&
            topCard.card.type === UnoCardType.NUMBER
        ) {
            if (card.value !== topCard.card.value) {
                return { valid: false, error: 'COLOR_AND_VALUE_MISMATCH' };
            }
        } else {
            return { valid: false, error: 'COLOR_MISMATCH' };
        }
    }

    return { valid: true };
}

/**
 * 完整校验玩家出牌
 */
export function validatePlayCard(
    playerId: string,
    cardId: string,
    currentPlayerId: string,
    player: Player | undefined,
    topCard: TopCard,
    pendingDraw2Count: number,
    pendingDraw4Count: number
): ValidationResult {
    const playerCheck = validatePlayerInput(playerId, currentPlayerId, player);
    if (!playerCheck.valid) return playerCheck;

    const cardCheck = validateCardInHand(cardId, player!);
    if (!cardCheck.valid) return cardCheck;

    const card = player!.hand.find((c) => c.id === cardId)!;

    const canPlayCheck = validateCanPlayCard(
        card,
        topCard,
        pendingDraw2Count,
        pendingDraw4Count
    );
    if (!canPlayCheck.valid) return canPlayCheck;

    return { valid: true };
}

/** 获取玩家可出的牌 */
export function getPlayableCards(
    player: Player,
    topCard: TopCard,
    pendingDraw2Count: number,
    pendingDraw4Count: number
): Card[] {
    return player.hand.filter((card) => {
        const result = validateCanPlayCard(
            card,
            topCard,
            pendingDraw2Count,
            pendingDraw4Count
        );
        return result.valid;
    });
}
