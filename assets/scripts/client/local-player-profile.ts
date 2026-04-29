/**
 * 本地玩家身份单例
 * 提供当前客户端的本地玩家 id 和名称
 * 当前硬编码默认值，后续登录/房间系统接入后替换身份来源
 */

import { _decorator } from 'cc';

const { ccclass } = _decorator;

@ccclass('LocalPlayerProfile')
export class LocalPlayerProfile {
    private static instance: LocalPlayerProfile | null = null;

    /** 硬编码的本地玩家 ID（使用非 player_0 的值用于验证） */
    private readonly localPlayerId: string = 'player_2';

    /** 硬编码的本地玩家名称 */
    private readonly localPlayerName: string = '你';

    static getInstance(): LocalPlayerProfile {
        if (!LocalPlayerProfile.instance) {
            LocalPlayerProfile.instance = new LocalPlayerProfile();
        }
        return LocalPlayerProfile.instance;
    }

    getLocalPlayerId(): string {
        return this.localPlayerId;
    }

    getLocalPlayerName(): string {
        return this.localPlayerName;
    }
}