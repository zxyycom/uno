import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PlayerTurnIndicator')
export class PlayerTurnIndicator extends Component {
    @property(Node)
    public highlightNode: Node = null!;

    private currentActive: boolean = false;

    public setActive(active: boolean): void {
        if (active === this.currentActive) return;
        this.currentActive = active;
        this.highlightNode.active = active;
    }
}
