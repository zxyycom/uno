import { Card, GameDirection, Player } from '../types/game.types';

/**
 * 玩家管理器 - 统一管理玩家数据和操作
 */
export class PlayManager {
    readonly players: Player[];
    readonly playersById: Map<string, Player>;
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
        for (const player of players) {
            this.playersById.set(player.id, player);
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
        const idx = this.players.findIndex((p) => p.id === player.id);
        if (idx !== -1) {
            this.players[idx] = player;
        }
        this.playersById.set(player.id, player);
    }

    /** 从玩家手牌中移除一张卡 */
    removeCardFromHand(playerId: string, cardId: string): Card | null {
        const player = this.getPlayerById(playerId);
        if (!player) return null;

        const cardIndex = player.hand.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return null;

        const card = player.hand[cardIndex];
        const newHand = [...player.hand];
        newHand.splice(cardIndex, 1);
        this.updatePlayer({ ...player, hand: newHand });
        return card;
    }

    /** 添加一张卡到玩家手牌 */
    addCardToHand(playerId: string, card: Card): boolean {
        const player = this.getPlayerById(playerId);
        if (!player) return false;
        this.updatePlayer({ ...player, hand: [...player.hand, card] });
        return true;
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
