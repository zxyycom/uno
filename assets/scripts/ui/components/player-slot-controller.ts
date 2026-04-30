import { _decorator, Component } from 'cc';

import {
    CallUnoPayload,
    eventBus,
    GameEventType,
    HandUpdatedPayload,
    StartGamePayload,
    TurnChangedPayload,
    TurnTimerSyncPayload,
} from '../../foundation/events';
import { PlayerSlotDirection } from '../utils/seat-direction';
import { PlayerHandCountView } from './player-hand-count-view';
import { PlayerSeatView } from './player-seat-view';
import { PlayerTurnCountdown } from './player-turn-countdown';
import { PlayerTurnIndicator } from './player-turn-indicator';

const { ccclass, property } = _decorator;

@ccclass('PlayerSlotController')
export class PlayerSlotController extends Component {
    @property(PlayerSeatView)
    public seatView: PlayerSeatView = null!;

    @property(PlayerTurnIndicator)
    public turnIndicator: PlayerTurnIndicator = null!;

    @property(PlayerTurnCountdown)
    public turnCountdown: PlayerTurnCountdown = null!;

    @property(PlayerHandCountView)
    public handCountView: PlayerHandCountView = null!;

    private playerId: string = '';
    private direction: PlayerSlotDirection = 'bottom';
    private isLocalPlayer: boolean = false;

    public initSlot(
        playerId: string,
        playerName: string,
        isLocalPlayer: boolean,
        direction: PlayerSlotDirection
    ): void {
        this.playerId = playerId;
        this.direction = direction;
        this.isLocalPlayer = isLocalPlayer;

        this.seatView.setPlayer(playerName, direction);
        this.turnIndicator.setActive(false);
        this.turnCountdown.stopCountdown();
        this.handCountView.setCount(0);
        this.handCountView.setUnoActive(false);
    }

    start(): void {
        this.initEventSubscriptions();
    }

    onDestroy(): void {
        eventBus.targetOff(this);
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            (payload) => {
                this.onStartGame(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
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
                this.onCallUno(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.TURN_TIMER_SYNC,
            (payload) => {
                this.onTurnTimerSync(payload);
            },
            this
        );

        eventBus.on(GameEventType.GAME_OVER, this.onGameOver, this);
    }

    private onStartGame(_payload: StartGamePayload): void {
        this.turnIndicator.setActive(false);
        this.turnCountdown.stopCountdown();
        this.handCountView.setUnoActive(false);
    }

    private onTurnChanged(payload: TurnChangedPayload): void {
        const isActive = payload.currentPlayer.id === this.playerId;
        this.turnIndicator.setActive(isActive);
        if (isActive) {
            this.turnCountdown.startCountdown(30);
        } else {
            this.turnCountdown.stopCountdown();
        }
    }

    private onHandUpdated(payload: HandUpdatedPayload): void {
        if (payload.playerId !== this.playerId) return;
        this.handCountView.setCount(payload.cardCount);
        if (payload.cardCount !== 1) {
            this.handCountView.setUnoActive(false);
        }
    }

    private onCallUno(payload: CallUnoPayload): void {
        if (payload.player.id !== this.playerId) return;
        this.handCountView.setUnoActive(true);
    }

    private onTurnTimerSync(payload: TurnTimerSyncPayload): void {
        if (payload.playerId !== this.playerId) return;
        this.turnCountdown.syncRemaining(
            payload.remainingSeconds,
            payload.totalSeconds
        );
    }

    private onGameOver(): void {
        this.turnIndicator.setActive(false);
        this.turnCountdown.stopCountdown();
    }
}
