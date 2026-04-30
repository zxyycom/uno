/**
 * UNO卡牌游戏 - 核心类型定义
 */

/** 卡牌颜色 */
export enum CardColor {
    RED = 'red',
    YELLOW = 'yellow',
    GREEN = 'green',
    BLUE = 'blue',
}

/** 特殊卡牌类型 */
export enum UnoCardType {
    NUMBER = 'number',
    REVERSE = 'reverse',
    SKIP = 'skip',
    DRAW_2 = 'draw_2',
    WILD = 'wild',
    WILD_DRAW_4 = 'wild_draw_4',
}

/** 数字牌数值 */
export enum CardNumber {
    ZERO = 0,
    ONE = 1,
    TWO = 2,
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
}

/** 游戏方向 */
export enum GameDirection {
    CLOCKWISE = 1,
    COUNTERCLOCKWISE = -1,
}

/** 玩家类型 */
export enum PlayerType {
    HUMAN = 'human',
    AI = 'ai',
}

/** 卡牌数据结构 */
export interface Card {
    /** 唯一标识 */
    id: string;
    /** 卡牌类型 */
    type: UnoCardType;
    /** 颜色(万能牌可为null) */
    color: CardColor | null;
    /** 数值(数字牌使用) */
    value: CardNumber | null;
}

/** 卡牌集合接口：实现必须同时维护顺序与按 id 索引能力 */
export interface CardCollection {
    readonly size: number;
    replaceAll(cards: readonly Card[]): void;
    has(cardId: string): boolean;
    get(cardId: string): Card;
    remove(cardId: string): Card;
    add(card: Card): void;
    some(
        predicate: (card: Card, index: number, cards: readonly Card[]) => boolean
    ): boolean;
    filter(
        predicate: (card: Card, index: number, cards: readonly Card[]) => boolean
    ): Card[];
    toArray(): Card[];
}

/** 玩家数据结构 */
export interface Player {
    /** 玩家ID */
    id: string;
    /** 玩家名称 */
    name: string;
    /** 玩家类型 */
    type: PlayerType;
    /** 手牌 */
    hand: CardCollection;
    /** 是否已宣告UNO */
    calledUno: boolean;
}

/** 玩家启动结构 - 用于初始化游戏 */
export interface GamePlayerSetup {
    /** 玩家ID */
    id: string;
    /** 玩家名称 */
    name: string;
    /** 玩家类型 */
    type: PlayerType;
    /** 座位索引，只用于排序，绝对值不重要，4个玩家必须唯一且有序 */
    seatIndex: number;
}

/** 游戏配置 */
export interface GameConfig {
    /** 玩家数量 */
    playerCount: number;
    /** AI数量 */
    aiCount: number;
    /** 超时时间(秒) */
    timeoutSeconds: number;
    /** 每张卡牌发牌间隔(ms) */
    dealInterval: number;
    /** AI思考延迟(ms) */
    aiThinkDelay: number;
}

/** 初始配置默认值 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
    playerCount: 1,
    aiCount: 1,
    timeoutSeconds: 30,
    dealInterval: 100,
    aiThinkDelay: 1500,
};

/** 当前打出的卡牌信息 */
export interface TopCard {
    card: Card;
    /** 当前生效颜色 */
    activeColor: CardColor;
    /** +2连续计数 */
    draw2Count: number;
    /** +4连续计数 */
    draw4Count: number;
}
