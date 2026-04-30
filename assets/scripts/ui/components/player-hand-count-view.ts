import { _decorator, Component, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PlayerHandCountView')
export class PlayerHandCountView extends Component {
    @property(Label)
    public countLabel: Label = null!;

    @property(Label)
    public unoLabel: Label = null!;

    public setCount(count: number): void {
        this.countLabel.string = count.toString();
    }

    public setUnoActive(active: boolean): void {
        this.unoLabel.node.active = active;
    }
}
