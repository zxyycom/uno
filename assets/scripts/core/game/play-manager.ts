import { Card, GameDirection, Player } from '../../foundation/types/game.types';

type RemoveCardResult = {
    card: Card;
    hand: Card[];
};

function removeCardFromPlayerHand(hand: Card[], cardId: string): RemoveCardResult {
    const card = hand.find((item) => item.id === cardId)!;
    const nextHand = hand.filter((item) => item.id !== card.id);
    return {
        card,
        hand: nextHand,
    };
}

function addCardToPlayerHand(hand: Card[], card: Card): Card[] {
    return [...hand, card];
}

/**
 * 单玩家管理器 - 提供单个玩家的稳定引用和接口
 */
export class SinglePlayerManager {
    readonly playerId: string;
    private readonly playManager: PlayManager;

    constructor(playManager: PlayManager, playerId: string) {
        this.playManager = playManager;
        this.playerId = playerId;
    }

    get player(): Player {
        return this.playManager.getPlayerById(this.playerId)!;
    }

    get hand(): Card[] {
        return this.player.hand;
    }

    get cardCount(): number {
        return this.player.hand.length;
    }

    isCurrentPlayer(): boolean {
        return this.playManager.isCurrentPlayer(this.playerId);
    }

    replace(player: Player): void {
        this.playManager.updatePlayer(player);
    }

    removeCard(cardId: string): Card {
        const currentPlayer = this.player;
        const result = removeCardFromPlayerHand(currentPlayer.hand, cardId);
        this.replace({
            ...currentPlayer,
            hand: result.hand,
        });
        return result.card;
    }

    addCard(card: Card): void {
        const currentPlayer = this.player;
        const nextHand = addCardToPlayerHand(currentPlayer.hand, card);
        this.replace({
            ...currentPlayer,
            hand: nextHand,
        });
    }
}

/**
 * 玩家管理器 - 统一管理玩家数据和操作
 */
export class PlayManager {
    readonly players: Player[];
    readonly playersById: Map<string, Player>;
    readonly playerIndexById: Map<string, number>;
    readonly singlePlayersById: Map<string, SinglePlayerManager>;
    readonly singlePlayers: SinglePlayerManager[];
    private _currentPlayerIndex: number;
    private _direction: GameDirection;

    constructor(
        players: Player[],
        currentPlayerIndex: number,
        direction: GameDirection
    ) {
        this.players = players;
        this._currentPlayerIndex = currentPlayerIndex;
        this._direction = direction;

        this.playersById = new Map<string, Player>();
        this.playerIndexById = new Map<string, number>();
        this.singlePlayersById = new Map<string, SinglePlayerManager>();
        this.singlePlayers = [];
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            this.playersById.set(player.id, player);
            this.playerIndexById.set(player.id, i);
            const singlePlayer = new SinglePlayerManager(this, player.id);
            this.singlePlayers.push(singlePlayer);
            this.singlePlayersById.set(player.id, singlePlayer);
        }
    }

    get currentPlayerIndex(): number {
        return this._currentPlayerIndex;
    }

    get direction(): GameDirection {
        return this._direction;
    }

    /** 根据当前方向获取下一个玩家 */
    getNextPlayer(): Player {
        const nextIdx = this._getNextIndex(
            this._currentPlayerIndex,
            this._direction
        );
        return this.players[nextIdx];
    }

    /** 根据当前方向获取下一个玩家的索引 */
    getNextPlayerIndex(): number {
        return this._getNextIndex(this._currentPlayerIndex, this._direction);
    }

    /** 根据指定方向获取下一个玩家 */
    getNextPlayerByDirection(direction: GameDirection): Player {
        const nextIdx = this._getNextIndex(this._currentPlayerIndex, direction);
        return this.players[nextIdx];
    }

    /** 根据指定方向和跳过的玩家数获取下一个玩家 */
    getNextPlayerByDirectionAndSkip(
        direction: GameDirection,
        skip: number
    ): Player {
        const nextIdx = this._getNextIndex(
            this._currentPlayerIndex,
            direction,
            skip
        );
        return this.players[nextIdx];
    }

    /** 根据索引获取玩家 */
    getPlayer(index: number): Player | undefined {
        return this.players[index];
    }

    /** 根据ID获取玩家 */
    getPlayerById(id: string): Player | undefined {
        return this.playersById.get(id);
    }

    /** 根据ID获取单玩家管理器 */
    getPlayerManagerById(id: string): SinglePlayerManager | undefined {
        return this.singlePlayersById.get(id);
    }

    /** 获取当前玩家的单玩家管理器 */
    getCurrentPlayerManager(): SinglePlayerManager {
        return this.singlePlayers[this._currentPlayerIndex];
    }

    /** 获取所有单玩家管理器 */
    getAllPlayerManagers(): readonly SinglePlayerManager[] {
        return this.singlePlayers;
    }

    /** 获取当前玩家 */
    getCurrentPlayer(): Player {
        return this.players[this._currentPlayerIndex];
    }

    /** 根据ID判断是否为当前玩家 */
    isCurrentPlayer(id: string): boolean {
        return this.getCurrentPlayer().id === id;
    }

    /** 更新玩家信息 */
    updatePlayer(player: Player): void {
        const idx = this.playerIndexById.get(player.id)!;
        this.players[idx] = player;
        this.playersById.set(player.id, player);
    }

    /** 从玩家手牌中移除一张卡 */
    removeCardFromHand(playerId: string, cardId: string): Card {
        const playerManager = this.getPlayerManagerById(playerId)!;
        return playerManager.removeCard(cardId);
    }

    /** 添加一张卡到玩家手牌 */
    addCardToHand(playerId: string, card: Card): void {
        const playerManager = this.getPlayerManagerById(playerId)!;
        playerManager.addCard(card);
    }

    /** 设置当前玩家索引 */
    setCurrentPlayerIndex(index: number): void {
        this._currentPlayerIndex = index;
    }

    /** 移动到下一个玩家 */
    moveToNextPlayer(): void {
        this._currentPlayerIndex = this._getNextIndex(
            this._currentPlayerIndex,
            this._direction
        );
    }

    /** 反转方向 */
    reverseDirection(): void {
        this._direction = -this._direction as GameDirection;
    }

    private _getNextIndex(
        currentIndex: number,
        direction: GameDirection,
        skip: number = 0
    ): number {
        let nextIdx = currentIndex;
        for (let i = 0; i <= skip; i++) {
            nextIdx =
                (nextIdx + direction + this.players.length) %
                this.players.length;
        }
        return nextIdx;
    }
}
