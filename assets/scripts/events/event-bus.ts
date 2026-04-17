import { EventTarget } from 'cc';

type BeforeCallback<T extends unknown[]> = (...args: T) => boolean | void;

export class EventBus<Events extends Record<string, unknown[]>> {
    private beforeListeners = new Map<
        keyof Events,
        Array<{ callback: BeforeCallback<any>; target: unknown }>
    >();

    constructor(private center: EventTarget) {}

    on<K extends keyof Events>(
        event: K,
        callback: (...args: Events[K]) => void,
        target?: unknown
    ): void {
        this.center.on(event as string, callback, target);
    }

    once<K extends keyof Events>(
        event: K,
        callback: (...args: Events[K]) => void,
        target?: unknown
    ): void {
        this.center.once(event as string, callback, target);
    }

    off<K extends keyof Events>(
        event: K,
        callback: (...args: Events[K]) => void,
        target?: unknown
    ): void {
        this.center.off(event as string, callback, target);
    }

    targetOff(target: unknown): void {
        this.center.targetOff(target);
        for (const [event, listeners] of this.beforeListeners) {
            const filtered = listeners.filter((l) => l.target !== target);
            if (filtered.length === 0) {
                this.beforeListeners.delete(event);
            } else {
                this.beforeListeners.set(event, filtered);
            }
        }
    }

    before<K extends keyof Events>(
        event: K,
        callback: BeforeCallback<Events[K]>,
        target?: unknown
    ): void {
        if (!this.beforeListeners.has(event)) {
            this.beforeListeners.set(event, []);
        }
        this.beforeListeners.get(event)!.push({ callback, target });
    }

    offBefore<K extends keyof Events>(
        event: K,
        callback: BeforeCallback<Events[K]>,
        target?: unknown
    ): void {
        const listeners = this.beforeListeners.get(event);
        if (!listeners) return;
        const filtered = listeners.filter(
            (l) => !(l.callback === callback && l.target === target)
        );
        if (filtered.length === 0) {
            this.beforeListeners.delete(event);
        } else {
            this.beforeListeners.set(event, filtered);
        }
    }

    emit<K extends keyof Events>(key: K, ...args: Events[K]): void {
        const hooks = this.beforeListeners.get(key);
        if (hooks) {
            for (const hook of hooks) {
                if (hook.callback.call(hook.target, ...args) === false) return;
            }
        }
        this.center.emit(key as string, ...args);
    }
}
