/**
 * UI管理器
 * 协调所有UI组件的初始化和事件订阅
 */

import { _decorator, Component, Node } from 'cc';

import { GameManager } from '../../core/machine/game-manager';
import { DeckComponent } from './deck-component';
import { GameBoard } from './game-board';
import { GameMessage } from './game-message';
import { PlayerHand } from './player-hand';
import { PlayerIndicator } from './player-indicator';

const { ccclass, property } = _decorator;
const AI_DISPLAY_NAMES = ['小橘子', '阳光男孩', '酷盖'];

@ccclass('UIManager')
export class UIManager extends Component {
    @property
    public autoStartOnLoad: boolean = true;

    @property
    public playerCount: number = 1;

    @property
    public aiCount: number = 3;

    @property(GameBoard)
    public gameBoard: GameBoard | null = null;

    @property(PlayerHand)
    public playerHand: PlayerHand | null = null;

    @property(DeckComponent)
    public deckComponent: DeckComponent | null = null;

    @property(Node)
    public playerIndicators: Node | null = null;

    @property(GameMessage)
    public gameMessage: GameMessage | null = null;

    private gameManager: GameManager | null = null;

    start() {
        this.initUIComponents();
        if (this.autoStartOnLoad) {
            // Delay one frame so all UI components finish start() and subscribe first.
            this.scheduleOnce(() => {
                this.startNewGame();
            }, 0);
        }
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化UI组件 */
    private initUIComponents(): void {
        // 获取游戏管理器
        this.gameManager = GameManager.getInstance();

        // 初始化玩家手牌（人类玩家）
        if (this.playerHand) {
            this.playerHand.init('player_0');
        }

        // 初始化玩家指示器
        if (this.playerIndicators) {
            const indicators = this.playerIndicators.children;
            for (let i = 0; i < indicators.length; i++) {
                const indicator = indicators[i].getComponent(PlayerIndicator);
                if (indicator) {
                    const playerId = i === 0 ? 'player_0' : `ai_${i}`;
                    const playerName =
                        i === 0
                            ? '你'
                            : (AI_DISPLAY_NAMES[i - 1] ?? `AI玩家${i}`);
                    indicator.init(playerId, playerName);
                }
            }
        }
    }

    /** 开始新游戏 */
    public startNewGame(): void {
        if (this.gameManager) {
            this.gameManager.startGame(this.playerCount, this.aiCount);
        }
    }

    /** 取消订阅 */
    public dispose(): void {
        // 当前管理器仅负责初始化，不维护事件订阅
    }
}
