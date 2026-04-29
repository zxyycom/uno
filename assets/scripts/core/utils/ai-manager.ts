/**
 * AI管理器
 */

import {
    Card,
    CardColor,
    GameConfig,
    Player,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';
import {
    randomChoice,
    randomFloat,
    randomInt,
} from '../../foundation/utils/random-seed';
import { getPlayableCards } from './input-validator';

export type AIAction =
    | {
          action: 'play';
          card: Card;
          chosenColor?: CardColor;
      }
    | {
          action: 'draw';
      };

export type AIActionCallback = (action: AIAction) => void;

export class AIManager {
    private config: GameConfig;
    private thinkTimerId: number | null = null;

    constructor(config: GameConfig) {
        this.config = config;
    }

    requestAIDecision(
        player: Player,
        topCard: TopCard,
        callback: AIActionCallback
    ): void {
        const thinkTime = this.config.aiThinkDelay + randomFloat(0, 1) * 500;

        this.thinkTimerId = setTimeout(() => {
            const action = this.decideAIAction(player, topCard);
            callback(action);
        }, thinkTime);
    }

    decideAIAction(player: Player, topCard: TopCard): AIAction {
        const playableCards = getPlayableCards(player, topCard);

        if (playableCards.length === 0) {
            return { action: 'draw' };
        }

        // 道具牌（REVERSE、SKIP、DRAW_2、WILD、WILD_DRAW_4）
        const actionCards = playableCards.filter(
            (c) => c.type !== UnoCardType.NUMBER
        );
        const numberCards = playableCards.filter(
            (c) => c.type === UnoCardType.NUMBER
        );

        // 20% 概率出道具牌；如果没有数字牌，则必须从可出的道具牌中选择。
        if (
            actionCards.length > 0 &&
            (numberCards.length === 0 || randomInt(0, 99) < 20)
        ) {
            const card = randomChoice(actionCards);
            return this.createPlayAction(player, card);
        }

        // 随机出牌
        const cardToPlay = randomChoice(numberCards);

        return this.createPlayAction(player, cardToPlay);
    }

    cancelAIThink(): void {
        if (this.thinkTimerId !== null) {
            clearTimeout(this.thinkTimerId);
            this.thinkTimerId = null;
        }
    }

    updateConfig(config: GameConfig): void {
        this.config = config;
    }

    destroy(): void {
        this.cancelAIThink();
    }

    private createPlayAction(player: Player, card: Card): AIAction {
        if (
            card.type !== UnoCardType.WILD &&
            card.type !== UnoCardType.WILD_DRAW_4
        ) {
            return { action: 'play', card };
        }

        return {
            action: 'play',
            card,
            chosenColor: this.chooseWildColor(player),
        };
    }

    private chooseWildColor(player: Player): CardColor {
        const colors = [
            CardColor.RED,
            CardColor.YELLOW,
            CardColor.GREEN,
            CardColor.BLUE,
        ];
        let selectedColor = colors[0];
        let selectedCount = -1;

        for (const color of colors) {
            const colorCount = player.hand.filter(
                (card) => card.color === color
            ).length;
            if (colorCount > selectedCount) {
                selectedColor = color;
                selectedCount = colorCount;
            }
        }

        return selectedColor;
    }
}
