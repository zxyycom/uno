import {
    Card,
    CardCollection as CardCollectionContract,
} from '../../foundation/types/game.types';

type CardLookup = {
    cardsById: Map<string, Card>;
    cardIndexById: Map<string, number>;
};

function buildCardLookup(cards: readonly Card[]): CardLookup {
    const cardsById = new Map<string, Card>();
    const cardIndexById = new Map<string, number>();
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        cardsById.set(card.id, card);
        cardIndexById.set(card.id, i);
    }
    return {
        cardsById,
        cardIndexById,
    };
}

export class CardCollection implements CardCollectionContract {
    private cards: Card[];
    private cardsById: Map<string, Card>;
    private cardIndexById: Map<string, number>;

    constructor(cards: readonly Card[]) {
        this.cards = [...cards];
        const lookup = buildCardLookup(cards);
        this.cardsById = lookup.cardsById;
        this.cardIndexById = lookup.cardIndexById;
    }

    get size(): number {
        return this.cards.length;
    }

    replaceAll(cards: readonly Card[]): void {
        this.cards = [...cards];
        const lookup = buildCardLookup(cards);
        this.cardsById = lookup.cardsById;
        this.cardIndexById = lookup.cardIndexById;
    }

    has(cardId: string): boolean {
        return this.cardsById.has(cardId);
    }

    get(cardId: string): Card {
        return this.cardsById.get(cardId)!;
    }

    remove(cardId: string): Card {
        const card = this.cardsById.get(cardId)!;
        const cardIndex = this.cardIndexById.get(cardId)!;

        this.cards.splice(cardIndex, 1);
        this.cardsById.delete(cardId);
        this.cardIndexById.delete(cardId);

        for (let i = cardIndex; i < this.cards.length; i++) {
            this.cardIndexById.set(this.cards[i].id, i);
        }

        return card;
    }

    add(card: Card): void {
        this.cards.push(card);
        this.cardsById.set(card.id, card);
        this.cardIndexById.set(card.id, this.cards.length - 1);
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
