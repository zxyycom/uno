import { _decorator, Component, Label, Sprite } from 'cc';

import { PlayerSlotDirection } from '../utils/seat-direction';

const { ccclass, property } = _decorator;

@ccclass('PlayerSeatView')
export class PlayerSeatView extends Component {
    @property(Label)
    public nameLabel: Label = null!;

    @property(Sprite)
    public avatarSprite: Sprite = null!;

    @property(Sprite)
    public seatBackground: Sprite = null!;

    public setPlayer(
        playerName: string,
        _direction: PlayerSlotDirection
    ): void {
        this.nameLabel.string = playerName;
    }
}
