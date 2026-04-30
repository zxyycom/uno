/**
 * 游戏初始化器
 * 集中管理游戏初始化的所有逻辑
 */

import {
    CardColor,
    GameDirection,
    GamePlayerSetup,
    Player,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';
import { initRandom } from '../../foundation/utils/random-seed';
import { DeckManager } from '../deck/deck-manager';
import { createDeck, shuffle } from '../utils/deck-helper';
import { CardCollection } from './card-collection';
import { PlayManager } from './play-manager';

export interface InitResult {
    playManager: PlayManager;
    deckManager: DeckManager;
    topCard: TopCard;
}

/**
 * 根据 GamePlayerSetup 创建 Player
 */
function createPlayer(setup: GamePlayerSetup): Player {
    return {
        id: setup.id,
        name: setup.name,
        type: setup.type,
        hand: new CardCollection([]),
        calledUno: false,
    };
}

/**
 * 初始化玩家列表
 * @param setups 玩家启动结构数组，按 seatIndex 排序
 */
export function createPlayers(setups: readonly GamePlayerSetup[]): Player[] {
    return setups.map((setup) => createPlayer(setup));
}

/**
 * 初始化牌堆
 */
export function createShuffledDeck(): DeckManager {
    return new DeckManager(shuffle(createDeck()));
}

/**
 * 初始化手牌并设置初始打出的牌
 */
export function dealInitialHands(
    deckManager: DeckManager,
    playManager: PlayManager
): {
    playManager: PlayManager;
    deckManager: DeckManager;
    activeColor: CardColor;
} {
    const cardsPerPlayer = 7;
    const deck = deckManager.deck;

    // 发牌给每个玩家
    const updatedPlayers = playManager.players.map((player) => ({
        ...player,
        hand: new CardCollection(deck.slice(0, cardsPerPlayer)),
    }));

    // 复制牌堆并抽取第一张牌
    const deckCopy = [...deck];
    let firstCard = deckCopy.pop()!;

    // 确保第一张牌不是 WILD_DRAW_4
    while (firstCard.type === UnoCardType.WILD_DRAW_4 && deckCopy.length > 0) {
        deckCopy.unshift(firstCard);
        firstCard = deckCopy.pop()!;
    }

    // 剩余牌堆（去掉已发的手牌）
    const remainingDeck = deckCopy.slice(
        cardsPerPlayer * updatedPlayers.length
    );

    return {
        playManager: new PlayManager(
            updatedPlayers,
            0,
            GameDirection.CLOCKWISE
        ),
        deckManager: new DeckManager(remainingDeck, [firstCard]),
        activeColor: firstCard.color || CardColor.RED,
    };
}

/**
 * 一键初始化游戏
 * @param setups 玩家启动结构数组
 * @returns 初始化结果
 */
export function initializeGame(setups: readonly GamePlayerSetup[]): InitResult {
    // 初始化全局随机种子
    initRandom();

    // 1. 按 seatIndex 排序后创建玩家
    const sortedSetups = [...setups].sort((a, b) => a.seatIndex - b.seatIndex);
    const players = createPlayers(sortedSetups);
    const playManager = new PlayManager(players, 0, GameDirection.CLOCKWISE);

    // 2. 创建并洗牌
    const deckManager = createShuffledDeck();

    // 3. 发牌并获取第一张打出的牌
    const { playManager: finalPlayManager, deckManager: finalDeckManager } =
        dealInitialHands(deckManager, playManager);

    const firstCard = finalDeckManager.discardPile[0];
    const topCard: TopCard = {
        card: firstCard,
        activeColor: firstCard.color || CardColor.RED,
        draw2Count: 0,
        draw4Count: 0,
    };

    return {
        playManager: finalPlayManager,
        deckManager: finalDeckManager,
        topCard,
    };
}
