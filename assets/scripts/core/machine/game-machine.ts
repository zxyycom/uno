/**
 * 游戏状态机 - 基于 xstate v5
 * 管理游戏完整流程状态转换
 */

import { and, assign, setup } from '../../../libs/npm/xstate/xstate.js';

import { eventBus, GameEventType } from '../../foundation/events';
import {
    Card,
    CardColor,
    GamePlayerSetup,
    Player,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';
import { DeckManager } from '../deck/deck-manager';
import { initializeGame } from '../game/game-initializer';
import { PlayManager } from '../game/play-manager';
import { validateCanPlayCard } from '../utils/input-validator';

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
          players: readonly GamePlayerSetup[];
          localPlayerId: string;
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
            const { topCard, playManager } = context;
            const { playerId, card } = event;
            const playerManager = playManager.getPlayerManagerById(playerId);
            if (!playerManager) return false;
            // 牌在手中且符合出牌限制
            return (
                validateCanPlayCard(card, topCard) &&
                playerManager.hasCard(card.id)
            );
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
                event.players
            );
            context.playManager = playManager;
            context.deckManager = deckManager;
            context.topCard = topCard;
            context.winner = null;
            context.turn = 0;

            eventBus.emit(GameEventType.START_GAME, {
                players: event.players,
                localPlayerId: event.localPlayerId,
            });
            for (const player of context.playManager.players) {
                eventBus.emit(GameEventType.CARDS_DRAWN, {
                    player,
                    cards: player.hand.toArray(),
                });
            }
            eventBus.emit(GameEventType.DECK_UPDATED, {
                remainingCards: context.deckManager.deckCount,
            });
            eventBus.emit(GameEventType.DISCARD_UPDATED, {
                topCard: context.topCard.card,
                topCardInfo: context.topCard,
                discardCount: context.deckManager.discardCount,
            });
        },
        增加回合: assign(({ context }) => {
            return {
                turn: context.turn + 1,
            };
        }),
        应用卡牌效果: ({ context }) => {
            const { topCard, playManager } = context;

            if (!topCard.actionEffectResolved) {
                let skip = topCard.card.type === UnoCardType.SKIP;
                if (topCard.card.type === UnoCardType.REVERSE) {
                    const previousDirection = context.playManager.direction;
                    context.playManager.reverseDirection();
                    eventBus.emit(GameEventType.DIRECTION_CHANGED, {
                        previousDirection,
                        newDirection: context.playManager.direction,
                    });
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

                // SKIP/REVERSE/DRAW_2/WILD_DRAW_4 的动作效果已在此处处理完毕或无需处理，标记为已结算
                context.topCard.actionEffectResolved = true;
            }

            const previousPlayer = context.playManager.getCurrentPlayer();
            context.playManager.moveToNextPlayer();

            eventBus.emit(GameEventType.TURN_CHANGED, {
                previousPlayerId: previousPlayer.id,
                currentPlayer: context.playManager.getCurrentPlayer(),
                direction: context.playManager.direction,
            });
            eventBus.emit(GameEventType.CURRENT_PLAYER_UPDATED, {
                player: context.playManager.getCurrentPlayer(),
            });
        },
        出牌: ({ context, event }) => {
            if (event.type !== '出牌') return;
            const { playerId, card, chosenColor } = event;
            const { playManager, deckManager, topCard } = context;
            const playerManager = playManager.getPlayerManagerById(playerId)!;

            const removedCard = playerManager.removeCard(card.id);
            deckManager.discardOne(removedCard);

            const newColor =
                removedCard.type === UnoCardType.WILD ||
                removedCard.type === UnoCardType.WILD_DRAW_4
                    ? chosenColor || context.topCard.activeColor
                    : removedCard.color;

            const hasActionEffect =
                removedCard.type === UnoCardType.SKIP ||
                removedCard.type === UnoCardType.REVERSE;
            const hasDrawPenalty =
                removedCard.type === UnoCardType.DRAW_2 ||
                removedCard.type === UnoCardType.WILD_DRAW_4;
            const draw2Count =
                topCard.draw2Count +
                (removedCard.type === UnoCardType.DRAW_2 ? 1 : 0);
            const draw4Count =
                topCard.draw4Count +
                (removedCard.type === UnoCardType.WILD_DRAW_4 ? 1 : 0);

            context.topCard = {
                card: removedCard,
                activeColor: newColor || topCard.activeColor,
                draw2Count,
                draw4Count,
                actionEffectResolved: !hasActionEffect,
                drawPenaltyResolved: !hasDrawPenalty,
            };

            const player = playerManager.player;
            eventBus.emit(GameEventType.CARD_PLAYED, {
                player,
                card: removedCard,
                newActiveColor: context.topCard.activeColor,
                isSkipEffect: removedCard.type === UnoCardType.SKIP,
                isReverseEffect: removedCard.type === UnoCardType.REVERSE,
                isDraw2Effect: removedCard.type === UnoCardType.DRAW_2,
                isDraw4Effect: removedCard.type === UnoCardType.WILD_DRAW_4,
            });
            eventBus.emit(GameEventType.DISCARD_UPDATED, {
                topCard: context.topCard.card,
                topCardInfo: context.topCard,
                discardCount: context.deckManager.discardCount,
            });
        },
        自动呼叫UNO: ({ context }) => {
            const currentPlayer = context.playManager.getCurrentPlayer();
            if (currentPlayer.hand.size === 1) {
                eventBus.emit(GameEventType.CALL_UNO, {
                    player: currentPlayer,
                });
            }
        },
        更新赢家: ({ context }) => {
            const winner =
                context.playManager.players.find((p) => p.hand.size === 0) ||
                null;
            if (winner) {
                context.winner = winner;
                eventBus.emit(GameEventType.GAME_OVER, {
                    winner,
                    finalHands: context.playManager.players.map((player) => ({
                        playerId: player.id,
                        cardCount: player.hand.size,
                    })),
                });
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
            const drawPlayerManager =
                context.playManager.getPlayerManagerById(playerId)!;
            for (const drawnCard of drawnCards) {
                drawPlayerManager.addCard(drawnCard);
            }

            // 惩罚牌被摸走后重置
            context.topCard.draw2Count = 0;
            context.topCard.draw4Count = 0;
            context.topCard.drawPenaltyResolved = true;

            const drawPlayer = drawPlayerManager.player;
            eventBus.emit(GameEventType.CARDS_DRAWN, {
                player: drawPlayer,
                cards: drawnCards,
            });
            eventBus.emit(GameEventType.DECK_UPDATED, {
                remainingCards: context.deckManager.deckCount,
            });
            // 重洗时弃牌堆顶牌保留，UI 无需清理
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
            always: {
                target: '回合开始',
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
