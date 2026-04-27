import {
    Card,
    CardCollection as CardCollectionContract,
} from '../../foundation/types/game.types';

export class CardCollection implements CardCollectionContract {
    private cards: Card[];
    private cardsById: Map<string, Card>;

    constructor(cards: readonly Card[]) {
        this.cards = [...cards];
        this.cardsById = new Map(this.cards.map(card => [card.id, card]));
    }

    get size(): number {
        return this.cards.length;
    }

    replaceAll(cards: readonly Card[]): void {
        this.cards = [...cards];
        this.cardsById = new Map(this.cards.map(card => [card.id, card]));
    }

    has(cardId: string): boolean {
        return this.cardsById.has(cardId);
    }

    get(cardId: string): Card {
        return this.cardsById.get(cardId)!;
    }

    remove(cardId: string): Card {
        const card = this.cardsById.get(cardId)!;
        const cardIndex = this.cards.findIndex(c => c.id === cardId);

        this.cards.splice(cardIndex, 1);
        this.cardsById.delete(cardId);

        return card;
    }

    add(card: Card): void {
        this.cards.push(card);
        this.cardsById.set(card.id, card);
    }

    some(
        predicate: (
            card: Card,
            index: number,
            cards: readonly Card[]
        ) => boolean
    ): boolean {
        return this.cards.some(predicate);
    }

    filter(
        predicate: (
            card: Card,
            index: number,
            cards: readonly Card[]
        ) => boolean
    ): Card[] {
        return this.cards.filter(predicate);
    }

    toArray(): Card[] {
        return [...this.cards];
    }
}
