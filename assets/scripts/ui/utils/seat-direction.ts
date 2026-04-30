import { GamePlayerSetup } from '../../foundation/types/game.types';

export type PlayerSlotDirection = 'bottom' | 'right' | 'top' | 'left';

export interface PlayerIdByDirection {
    bottom: string;
    right: string;
    top: string;
    left: string;
}

/**
 * 根据本地玩家ID和玩家列表推算方位绑定
 * @param players 排序后的玩家列表（按 seatIndex 升序）
 * @param localPlayerId 本地玩家ID
 * @returns 方位映射，bottom=本地玩家，right/top/left 分别为后1/2/3位
 */
export function calculateDirectionBinding(
    players: readonly GamePlayerSetup[],
    localPlayerId: string
): PlayerIdByDirection {
    const localIndex = players.findIndex((p) => p.id === localPlayerId);
    const count = players.length;
    return {
        bottom: players[localIndex].id,
        right: players[(localIndex + 1) % count].id,
        top: players[(localIndex + 2) % count].id,
        left: players[(localIndex + 3) % count].id,
    };
}
