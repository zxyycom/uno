/**
 * Dual-Layer Logger
 *
 * Layer 1: LoggerContext — 等级过滤 + LogEntry 构造（自动 id、ts、context）
 * Layer 2: BatchLogger   — 缓冲 + 延迟 flush，对 Layer 1 透明
 *
 * 调用链：Logger.debug() → Layer1.buildEntry() → Layer2.log() → buffer
 *                                                        ↓
 *                                            setTimeout(delay) tick
 *                                                        ↓
 *                                              flushFn(batch)
 */

// ============================================================================
// Layer 2: BatchLogger（异步批量输出）
// ============================================================================

export interface LogEvent {
    id: number;
    ts: string;
    level: LogLevel;
    context: string;
    message: string;
    args: unknown[];
}

export type Transport = (events: LogEvent[]) => void;

export interface BatchLoggerOptions {
    transport: Transport;
    flushInterval?: number; // ms，默认 5
}

/**
 * 缓冲 + 延迟 flush
 * - 非阻塞写入：直接入数组
 * - 延迟批处理：setTimeout 归并同一时段的日志
 * - 可扩展：flushFn 由外部注入（console / file / http）
 */
export class BatchLogger {
    private _buffer: LogEvent[] = [];
    private _scheduled: boolean = false;
    private readonly _flushInterval: number;
    private readonly _transport: Transport;

    constructor(options: BatchLoggerOptions) {
        this._transport = options.transport;
        this._flushInterval = options.flushInterval ?? 5;
    }

    /** 非阻塞写入 */
    log(event: LogEvent): void {
        this._buffer.push(event);
        this._scheduleFlush();
    }

    /** 立即 flush，等待 transport 完成 */
    flush(): void {
        if (this._buffer.length === 0) {
            this._scheduled = false;
            return;
        }
        const batch = this._buffer.slice();
        this._buffer.length = 0;
        this._scheduled = false;
        this._transport(batch);
    }

    private _scheduleFlush(): void {
        if (this._scheduled) return;
        this._scheduled = true;
        globalThis.setTimeout?.(() => this.flush(), this._flushInterval);
    }
}

// ---------------------------------------------------------------------------
// 内置 Transport
// ---------------------------------------------------------------------------

export enum LogLevel {
    DEBUG = 0,
    LOG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    NONE = 5,
}

const LEVEL_NAMES: string[] = ['DEBUG', 'LOG', 'INFO', 'WARN', 'ERROR', 'NONE'];

export const ConsoleTransport: Transport = (events) => {
    const fnMap: Partial<Record<LogLevel, (...data: unknown[]) => void>> = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.LOG]: console.log,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
    };
    for (const e of events) {
        const fn = fnMap[e.level];
        if (!fn) continue;
        fn(
            `[${LEVEL_NAMES[e.level]}] [${e.ts}] [${e.id}] [${e.context}] ${e.message}`,
            ...e.args
        );
    }
};

// ============================================================================
// Layer 1: LoggerContext（日志上下文工厂）
// ============================================================================

export interface Logger {
    debug(msg: string, ...args: unknown[]): void;
    log(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
    flush(): void;
    setLevel(level: LogLevel): void;
}

export interface LoggerOptions {
    name?: string;
    context?: string;
    level?: LogLevel;
    writer?: BatchLogger | null;
}

let _idCounter = 0;
const nextId = (): number => ++_idCounter;

const DateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
});
function makeTimestamp(): string {
    const now = Date.now();
    const parts = DateTimeFormat.formatToParts(now);

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    return `${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.${map.fractionalSecond}Z`;
}

/** 全局默认 writer，单例 */
const _defaultWriter = new BatchLogger({
    transport: ConsoleTransport,
    flushInterval: 50,
});

function getDefaultWriter(): BatchLogger {
    return _defaultWriter;
}

/**
 * Layer 1：日志上下文工厂
 *
 * 职责：
 *   - 封装 name/context/level，构造具名 logger
 *   - 等级过滤：低于配置等级的日志直接丢弃
 *   - 构造 LogEvent（id、timestamp、context）
 *   - 委托 log() 给 BatchLogger
 */
export function createLogger(options: LoggerOptions = {}): Logger {
    const {
        name = 'app',
        context = '',
        level: minLevel = LogLevel.INFO,
        writer: writerOpt = null,
    } = options;

    const ctxStr = context || `[${name}]`;
    let level = minLevel;
    const writer = writerOpt ?? getDefaultWriter();

    function log(lvl: LogLevel, msg: string, ...args: unknown[]): void {
        if (lvl < level) return;
        const event: LogEvent = {
            id: nextId(),
            ts: makeTimestamp(),
            level: lvl,
            context: ctxStr,
            message: msg,
            args,
        };
        writer.log(event);
    }

    return {
        debug: (msg, ...a) => log(LogLevel.DEBUG, msg, ...a),
        log: (msg, ...a) => log(LogLevel.LOG, msg, ...a),
        info: (msg, ...a) => log(LogLevel.INFO, msg, ...a),
        warn: (msg, ...a) => log(LogLevel.WARN, msg, ...a),
        error: (msg, ...a) => log(LogLevel.ERROR, msg, ...a),
        flush(): void {
            writer.flush();
        },
        setLevel(lvl: LogLevel): void {
            level = lvl;
        },
    };
}
