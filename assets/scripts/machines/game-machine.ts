/**
 * 游戏状态机 - 基于 xstate v5
 * 管理游戏完整流程状态转换
 */

import { and, setup } from 'xstate';

import { eventBus, GameEventType } from '../events';
import { DeckManager } from '../logic/deck-manager';
import {
    Card,
    CardColor,
    Player,
    TopCard,
    UnoCardType,
} from '../types/game.types';
import { initializeGame } from './game-initializer';
import { PlayManager } from './play-manager';

// ==================== 类型定义 ====================

export type GameMachineContext = {
    playManager: PlayManager;
    deckManager: DeckManager;
    /** 牌堆顶的卡牌信息 */
    topCard: TopCard;
    winner: Player | null;
    /** 当前回合数 */
    turn: number;
};

// ==================== 事件类型 ====================

type GameMachineEvent =
    | {
          type: '开始游戏';
          playerCount: number;
          aiCount: number;
      }
    | { type: '初始化结束' }
    | { type: '放弃出牌'; playerId: string; turn: number }
    | { type: '超时'; playerId: string; turn: number }
    | {
          type: '出牌';
          playerId: string;
          card: Card;
          chosenColor?: CardColor;
          turn: number;
      }
    | { type: '摸牌结束'; playerId: string; turn: number };

// ==================== 状态机 ====================

export const gameMachine = setup({
    types: {
        context: {} as GameMachineContext,
        events: {} as GameMachineEvent,
    },
    guards: {
        合法出牌: ({ context, event }) => {
            if (event.type !== '出牌') return false;
            const { playerId, card } = event;
            const player = context.playManager.getPlayerById(playerId);
            if (!player) return false;
            return player.hand.some((c) => c.id === card.id) ?? false;
        },
        是否胜利: ({ context }) => {
            return context.winner !== null;
        },
        合法事件: ({ context, event }) => {
            if (
                event.type !== '放弃出牌' &&
                event.type !== '超时' &&
                event.type !== '出牌' &&
                event.type !== '摸牌结束'
            ) {
                return false;
            }
            return (
                context.turn === event.turn &&
                context.playManager.isCurrentPlayer(event.playerId)
            );
        },
    },
    actions: {
        初始化游戏: ({ context, event }) => {
            if (event.type !== '开始游戏') return;
            const { playManager, deckManager, topCard } = initializeGame(
                event.aiCount
            );
            context.playManager = playManager;
            context.deckManager = deckManager;
            context.topCard = topCard;
            context.winner = null;
            context.turn = 0;
        },
        增加回合: ({ context }) => {
            context.turn += 1;
        },
        应用卡牌效果: ({ context }) => {
            const { topCard, playManager } = context;

            let skip = topCard.card.type === UnoCardType.SKIP;
            if (topCard.card.type === UnoCardType.REVERSE) {
                context.playManager.reverseDirection();
                // 只剩两个人的时候等于禁用
                if (playManager.players.length === 2) {
                    skip = true;
                }
            }

            // SKIP: 跳过一个玩家
            if (skip) {
                const skippedPlayer = context.playManager.getNextPlayer();
                context.playManager.moveToNextPlayer();
                eventBus.emit(GameEventType.PLAYER_SKIPPED, {
                    skippedPlayer,
                });
            }

            const previousPlayer = context.playManager.getCurrentPlayer();
            context.playManager.moveToNextPlayer();

            eventBus.emit(GameEventType.TURN_CHANGED, {
                previousPlayerId: previousPlayer.id,
                currentPlayer: context.playManager.getCurrentPlayer(),
                direction: context.playManager.direction,
            });
        },
        出牌: ({ context, event }) => {
            if (event.type !== '出牌') return;
            const { playerId, card, chosenColor } = event;
            const { playManager, deckManager, topCard } = context;

            playManager.removeCardFromHand(playerId, card.id);
            deckManager.discardOne(card);

            const newColor =
                card.type === UnoCardType.WILD ||
                card.type === UnoCardType.WILD_DRAW_4
                    ? chosenColor || context.topCard.activeColor
                    : card.color;

            const draw2Count =
                topCard.draw2Count + (card.type === UnoCardType.DRAW_2 ? 1 : 0);
            const draw4Count =
                topCard.draw4Count +
                (card.type === UnoCardType.WILD_DRAW_4 ? 1 : 0);

            context.topCard = {
                card,
                activeColor: newColor || topCard.activeColor,
                draw2Count,
                draw4Count,
            };

            const player = playManager.getPlayerById(playerId);
            if (!player) return;
            eventBus.emit(GameEventType.CARD_PLAYED, {
                player,
                card,
            });
        },
        自动呼叫UNO: ({ context }) => {
            const currentPlayer = context.playManager.getCurrentPlayer();
            if (currentPlayer.hand.length === 1) {
                eventBus.emit(GameEventType.CALL_UNO, {
                    player: currentPlayer,
                });
            }
        },
        更新赢家: ({ context }) => {
            const winner =
                context.playManager.players.find((p) => p.hand.length === 0) ||
                null;
            if (winner) {
                context.winner = winner;
            }
        },
        摸牌: ({ context, event }) => {
            if (event.type !== '放弃出牌' && event.type !== '超时') {
                return;
            }
            const playerId = event.playerId;
            const { draw2Count, draw4Count } = context.topCard;

            const totalDrawCount =
                draw2Count === 0 && draw4Count === 0
                    ? 1
                    : draw2Count * 2 + draw4Count * 4;

            const result = context.deckManager.drawMultiple(totalDrawCount, {
                autoReshuffleOnInsufficient: true,
                failOnZeroResult: true,
            });

            if (result.type === 'fail') {
                console.warn('摸牌失败:', result.reason);
                return;
            }

            const drawnCards = result.cards;
            for (const drawnCard of drawnCards) {
                context.playManager.addCardToHand(playerId, drawnCard);
            }

            // 惩罚牌被摸走后重置
            context.topCard.draw2Count = 0;
            context.topCard.draw4Count = 0;

            const drawPlayer = context.playManager.getPlayerById(playerId);
            if (!drawPlayer) return;
            eventBus.emit(GameEventType.CARDS_DRAWN, {
                player: drawPlayer,
                cards: drawnCards,
            });
        },
    },
}).createMachine({
    id: 'unoGame',
    initial: '等待开始',
    context: {} as GameMachineContext,
    states: {
        等待开始: {
            on: {
                开始游戏: {
                    target: '初始化游戏',
                },
            },
        },
        初始化游戏: {
            entry: [{ type: '初始化游戏' }],
            on: {
                初始化结束: {
                    target: '回合开始',
                },
            },
        },
        回合开始: {
            entry: [{ type: '增加回合' }, { type: '应用卡牌效果' }],
            always: {
                target: '等待出牌',
            },
        },
        等待出牌: {
            on: {
                放弃出牌: {
                    target: '摸牌',
                    guard: { type: '合法事件' },
                },
                超时: {
                    target: '摸牌',
                    guard: { type: '合法事件' },
                },
                出牌: {
                    target: '回合结束',
                    guard: and([
                        {
                            type: '合法出牌',
                        },
                        {
                            type: '合法事件',
                        },
                    ]),
                    actions: [{ type: '出牌' }, { type: '更新赢家' }],
                },
            },
        },
        摸牌: {
            entry: [{ type: '摸牌' }],
            on: {
                摸牌结束: {
                    target: '回合开始',
                    guard: { type: '合法事件' },
                },
            },
        },
        回合结束: {
            entry: {
                type: '自动呼叫UNO',
            },
            always: [
                {
                    target: '游戏结束',
                    guard: {
                        type: '是否胜利',
                    },
                },
                {
                    target: '回合开始',
                },
            ],
        },
        游戏结束: {},
    },
});
