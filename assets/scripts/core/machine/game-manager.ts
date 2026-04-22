/**
 * 游戏管理器 - 整合状态机与游戏逻辑
 * 仅负责转发事件到状态机，所有业务校验由状态机完成
 */

import { _decorator, Component } from 'cc';
import { Actor, createActor } from '../../../libs/npm/xstate/xstate.js';

import {
    Card,
    CardColor,
    DEFAULT_GAME_CONFIG,
    GameConfig,
    TopCard,
} from '../../foundation/types/game.types';
import { gameMachine } from './game-machine';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    private static instance: GameManager | null = null;
    private actor: Actor<typeof gameMachine> | null = null;
    @property
    private config: GameConfig = DEFAULT_GAME_CONFIG; // CC序列化，无需读取
    /** 当前回合数 - 由状态机同步自动更新 */
    private currentTurn: number = 0;

    onLoad() {
        GameManager.instance = this;
    }

    /** 获取单例实例 */
    static getInstance(): GameManager | null {
        return GameManager.instance;
    }

    /** 初始化状态机 */
    private initMachine(): void {
        this.actor = createActor(gameMachine);
        // 订阅状态变化，自动同步 turn
        this.actor.subscribe((state) => {
            this.currentTurn = state.context.turn;
            // 监听进入等待出牌状态，启动超时定时器
            if (state.matches('等待出牌')) {
                this.startTimeoutTimer();
            }
        });
        this.actor.start();
    }

    /** 超时定时器回调 */
    private timeoutCallback: (() => void) | null = null;

    /** 启动超时定时器 */
    private startTimeoutTimer(): void {
        this.cancelTimeoutTimer();
        const currentPlayer = this.getCurrentPlayer();
        if (!currentPlayer) return;
        this.timeoutCallback = () => {
            this.onTimeout(currentPlayer.id);
        };
        this.scheduleOnce(this.timeoutCallback, this.config.timeoutSeconds);
    }

    /** 取消超时定时器 */
    private cancelTimeoutTimer(): void {
        if (this.timeoutCallback) {
            this.unschedule(this.timeoutCallback);
            this.timeoutCallback = null;
        }
    }

    /** 开始新游戏 */
    startGame(playerCount: number = 1, aiCount: number = 1): void {
        this.initMachine();
        this.actor?.send({
            type: '开始游戏',
            playerCount,
            aiCount,
        });
        this.scheduleOnce(() => {
            this.actor?.send({ type: '初始化结束' });
        }, this.config.timeoutSeconds);
    }

    /** 获取当前玩家 */
    getCurrentPlayer() {
        const state = this.actor?.getSnapshot();
        if (!state) return null;
        return state.context.playManager.getCurrentPlayer();
    }

    /** 获取顶牌信息 */
    getTopCard(): TopCard | null {
        const state = this.actor?.getSnapshot();
        if (!state) return null;
        return state.context.topCard;
    }

    /** 出牌 - 直接转发事件到状态机 */
    playCard(playerId: string, card: Card, chosenColor?: CardColor): void {
        this.actor?.send({
            type: '出牌',
            playerId,
            card,
            chosenColor,
            turn: this.currentTurn,
        });
    }

    /** 放弃出牌(摸牌) - 直接转发事件到状态机 */
    drawCard(playerId: string): void {
        this.actor?.send({
            type: '放弃出牌',
            playerId,
            turn: this.currentTurn,
        });
    }

    /** 超时 - 内部使用，状态机自动处理 */
    private onTimeout(playerId: string): void {
        this.actor?.send({
            type: '超时',
            playerId,
            turn: this.currentTurn,
        });
    }
}
