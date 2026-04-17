import {
    CallUnoPayload,
    CardPlayedPayload,
    eventBus,
    GameEventType,
    GameOverPayload,
    HandUpdatedPayload,
    TurnChangedPayload,
} from '../events';

export class UIGameEvents {
    constructor() {
        this.initSubscriptions();
    }

    private initSubscriptions(): void {
        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                console.log(`轮到玩家: ${payload.currentPlayerId}`);
                this.onTurnChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.CARD_PLAYED,
            (payload) => {
                console.log(`玩家 ${payload.playerId} 出牌`);
                this.onCardPlayed(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.GAME_OVER,
            (payload) => {
                console.log(`游戏结束! 获胜者: ${payload.winnerName}`);
                this.onGameOver(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.HAND_UPDATED,
            (payload) => {
                this.onHandUpdated(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.CALL_UNO,
            (payload) => {
                console.log(`玩家 ${payload.playerId} 呼叫 UNO!`);
                this.onUnoCalled(payload);
            },
            this
        );
    }

    private onTurnChanged(_payload: TurnChangedPayload): void {
        // TODO: 更新UI显示当前玩家
    }

    private onCardPlayed(payload: CardPlayedPayload): void {
        if (payload.isSkipEffect) {
            // TODO: 显示跳过提示
        }
        if (payload.isReverseEffect) {
            // TODO: 显示方向改变动画
        }
    }

    private onGameOver(_payload: GameOverPayload): void {
        // TODO: 显示游戏结束界面
    }

    private onHandUpdated(_payload: HandUpdatedPayload): void {
        // TODO: 更新手牌UI显示
    }

    private onUnoCalled(_payload: CallUnoPayload): void {
        // TODO: 显示UNO提示动画
    }

    public dispose(): void {
        eventBus.targetOff(this);
    }
}
