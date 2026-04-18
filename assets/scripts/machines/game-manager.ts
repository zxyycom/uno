/**
 * 游戏管理器 - 整合状态机与游戏逻辑
 * 仅负责转发事件到状态机，所有业务校验由状态机完成
 */

import { Actor, createActor } from 'xstate';

import {
    Card,
    CardColor,
    DEFAULT_GAME_CONFIG,
    GameConfig,
    TopCard,
} from '../types/game.types';
import { gameMachine } from './game-machine';

/** 游戏管理器单例 */
export class GameManager {
    private static instance: GameManager | null = null;
    private actor: Actor<typeof gameMachine> | null = null;
    private config: GameConfig;

    private constructor(config: GameConfig = DEFAULT_GAME_CONFIG) {
        this.config = config;
    }

    /** 获取单例实例 */
    static getInstance(config?: GameConfig): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager(config);
        }
        return GameManager.instance;
    }

    /** 初始化状态机 */
    private initMachine(): void {
        this.actor = createActor(gameMachine);
        this.actor.start();
    }

    /** 开始新游戏 */
    startGame(playerCount: number = 1, aiCount: number = 1): void {
        this.initMachine();
        this.actor?.send({
            type: '开始游戏',
            playerCount,
            aiCount,
        });
        setTimeout(() => {
            this.actor?.send({ type: '初始化结束' });
        }, 500);
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
        });
    }

    /** 摸牌 - 直接转发事件到状态机 */
    drawCard(playerId: string): void {
        this.actor?.send({
            type: '放弃出牌',
            playerId,
        });
    }

    /** 超时 - 直接转发事件到状态机 */
    timeout(playerId: string): void {
        this.actor?.send({
            type: '超时',
            playerId,
        });
    }
}
