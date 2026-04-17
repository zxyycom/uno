/**
 * 游戏事件总线 - 单例模式
 * 负责游戏事件的发布订阅
 */

import {
    EventListener,
    EventSubscription,
    GameEvent,
    GameEventType,
} from '../events/game.events';

/** 事件总线类 */
class EventBus {
    private static instance: EventBus;
    private listeners: Map<GameEventType | '*', Set<EventListener>> = new Map();

    private constructor() {}

    /** 获取单例实例 */
    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /** 订阅事件 */
    subscribe(
        eventType: GameEventType | '*',
        listener: EventListener
    ): EventSubscription {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)!.add(listener as EventListener);

        return {
            unsubscribe: () => {
                this.listeners
                    .get(eventType)
                    ?.delete(listener as EventListener);
            },
        };
    }

    /** 发布事件 */
    publish(event: GameEvent): void {
        // 触发特定事件订阅者
        const specificListeners = this.listeners.get(event.type);
        if (specificListeners) {
            for (const listener of specificListeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error(
                        `Error in event listener for ${event.type}:`,
                        error
                    );
                }
            }
        }

        // 触发通配符订阅者
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            for (const listener of wildcardListeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`Error in wildcard event listener:`, error);
                }
            }
        }
    }

    /** 清除所有订阅 */
    clear(): void {
        this.listeners.clear();
    }

    /** 获取订阅计数 */
    getListenerCount(eventType?: GameEventType): number {
        if (eventType) {
            return this.listeners.get(eventType)?.size ?? 0;
        }
        let total = 0;
        for (const set of this.listeners.values()) {
            total += set.size;
        }
        return total;
    }
}

/** 导出单例获取函数 */
export const eventBus = EventBus.getInstance();

/** 快捷发布函数 */
export function publishEvent(event: GameEvent): void {
    eventBus.publish(event);
}

/** 快捷订阅函数 */
export function subscribeEvent(
    eventType: GameEventType | '*',
    listener: EventListener
): EventSubscription {
    return eventBus.subscribe(eventType, listener);
}
