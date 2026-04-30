import { _decorator, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PlayerTurnCountdown')
export class PlayerTurnCountdown extends Component {
    @property(Label)
    public countdownLabel: Label = null!;

    @property(Node)
    public countdownNode: Node = null!;

    private totalSeconds: number = 0;
    private remainingSeconds: number = 0;
    private tickHandle: (() => void) | null = null;
    private isRunning: boolean = false;

    public startCountdown(totalSeconds: number): void {
        this.totalSeconds = totalSeconds;
        this.remainingSeconds = totalSeconds;
        this.isRunning = true;
        this.countdownNode.active = true;
        this.updateDisplay();
        this.startTick();
    }

    public syncRemaining(remainingSeconds: number, totalSeconds: number): void {
        this.totalSeconds = totalSeconds;
        this.remainingSeconds = remainingSeconds;
        this.updateDisplay();
    }

    public stopCountdown(): void {
        this.isRunning = false;
        this.cancelTick();
        this.countdownNode.active = false;
    }

    private startTick(): void {
        this.cancelTick();
        this.tickHandle = (): void => {
            if (!this.isRunning) return;
            this.remainingSeconds -= 1;
            if (this.remainingSeconds <= 0) {
                this.remainingSeconds = 0;
                this.stopCountdown();
                return;
            }
            this.updateDisplay();
            this.scheduleOnce(this.tickHandle!, 1);
        };
        this.scheduleOnce(this.tickHandle, 1);
    }

    private cancelTick(): void {
        if (this.tickHandle) {
            this.unschedule(this.tickHandle);
            this.tickHandle = null;
        }
    }

    private updateDisplay(): void {
        this.countdownLabel.string = `${this.remainingSeconds}s`;
    }

    onDestroy(): void {
        this.cancelTick();
    }
}
