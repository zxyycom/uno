type InspectionEvent =
    | InspectedSnapshotEvent
    | InspectedEventEvent
    | InspectedActorEvent
    | InspectedMicrostepEvent
    | InspectedActionEvent;
interface BaseInspectionEventProperties {
    rootId: string;
    /**
     * The relevant actorRef for the inspection event.
     *
     * - For snapshot events, this is the `actorRef` of the snapshot.
     * - For event events, this is the target `actorRef` (recipient of event).
     * - For actor events, this is the `actorRef` of the registered actor.
     */
    actorRef: ActorRefLike;
}
interface InspectedSnapshotEvent extends BaseInspectionEventProperties {
    type: '@xstate.snapshot';
    event: AnyEventObject;
    snapshot: Snapshot<unknown>;
}
interface InspectedMicrostepEvent extends BaseInspectionEventProperties {
    type: '@xstate.microstep';
    event: AnyEventObject;
    snapshot: Snapshot<unknown>;
    _transitions: AnyTransitionDefinition[];
}
interface InspectedActionEvent extends BaseInspectionEventProperties {
    type: '@xstate.action';
    action: {
        type: string;
        params: unknown;
    };
}
interface InspectedEventEvent extends BaseInspectionEventProperties {
    type: '@xstate.event';
    sourceRef: ActorRefLike | undefined;
    event: AnyEventObject;
}
interface InspectedActorEvent extends BaseInspectionEventProperties {
    type: '@xstate.actor';
}

interface ScheduledEvent {
    id: string;
    event: EventObject;
    startedAt: number;
    delay: number;
    source: AnyActorRef;
    target: AnyActorRef;
}
interface Clock {
    setTimeout(fn: (...args: any[]) => void, timeout: number): any;
    clearTimeout(id: any): void;
}
interface Scheduler {
    schedule(
        source: AnyActorRef,
        target: AnyActorRef,
        event: EventObject,
        delay: number,
        id: string | undefined
    ): void;
    cancel(source: AnyActorRef, id: string): void;
    cancelAll(actorRef: AnyActorRef): void;
}
interface ActorSystem<T extends ActorSystemInfo> {
    get: <K extends keyof T['actors']>(key: K) => T['actors'][K] | undefined;
    getAll: () => Partial<T['actors']>;
    inspect: (
        observer:
            | Observer<InspectionEvent>
            | ((inspectionEvent: InspectionEvent) => void)
    ) => Subscription;
    scheduler: Scheduler;
    getSnapshot: () => {
        _scheduledEvents: Record<string, ScheduledEvent>;
    };
    start: () => void;
    _clock: Clock;
    _logger: (...args: any[]) => void;
}
type AnyActorSystem = ActorSystem<any>;

declare class StateMachine<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TStateValue extends StateValue,
    TTag extends string,
    TInput,
    TOutput,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
    TStateSchema extends StateSchema,
> implements ActorLogic<
    MachineSnapshot<
        TContext,
        TEvent,
        TChildren,
        TStateValue,
        TTag,
        TOutput,
        TMeta,
        TStateSchema
    >,
    TEvent,
    TInput,
    AnyActorSystem,
    TEmitted
> {
    /** The raw config used to create the machine. */
    config: MachineConfig<
        TContext,
        TEvent,
        any,
        any,
        any,
        any,
        any,
        any,
        TOutput,
        any, // TEmitted
        any
    > & {
        schemas?: unknown;
    };
    /** The machine's own version. */
    version?: string;
    schemas: unknown;
    implementations: MachineImplementationsSimplified<TContext, TEvent>;
    root: StateNode<TContext, TEvent>;
    id: string;
    states: StateNode<TContext, TEvent>['states'];
    events: Array<EventDescriptor<TEvent>>;
    constructor(
        /** The raw config used to create the machine. */
        config: MachineConfig<
            TContext,
            TEvent,
            any,
            any,
            any,
            any,
            any,
            any,
            TOutput,
            any, // TEmitted
            any
        > & {
            schemas?: unknown;
        },
        implementations?: MachineImplementationsSimplified<TContext, TEvent>
    );
    /**
     * Clones this state machine with the provided implementations.
     *
     * @param implementations Options (`actions`, `guards`, `actors`, `delays`) to
     *   recursively merge with the existing options.
     * @returns A new `StateMachine` instance with the provided implementations.
     */
    provide(
        implementations: InternalMachineImplementations<
            ResolvedStateMachineTypes<
                TContext,
                DoNotInfer<TEvent>,
                TActor,
                TAction,
                TGuard,
                TDelay,
                TTag,
                TEmitted
            >
        >
    ): StateMachine<
        TContext,
        TEvent,
        TChildren,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TStateValue,
        TTag,
        TInput,
        TOutput,
        TEmitted,
        TMeta,
        TStateSchema
    >;
    resolveState(
        config: {
            value: StateValue;
            context?: TContext;
            historyValue?: HistoryValue<TContext, TEvent>;
            status?: SnapshotStatus;
            output?: TOutput;
            error?: unknown;
        } & (Equals<TContext, MachineContext> extends false
            ? {
                  context: unknown;
              }
            : {})
    ): MachineSnapshot<
        TContext,
        TEvent,
        TChildren,
        TStateValue,
        TTag,
        TOutput,
        TMeta,
        TStateSchema
    >;
    /**
     * Determines the next snapshot given the current `snapshot` and received
     * `event`. Calculates a full macrostep from all microsteps.
     *
     * @param snapshot The current snapshot
     * @param event The received event
     */
    transition(
        snapshot: MachineSnapshot<
            TContext,
            TEvent,
            TChildren,
            TStateValue,
            TTag,
            TOutput,
            TMeta,
            TStateSchema
        >,
        event: TEvent,
        actorScope: ActorScope<
            typeof snapshot,
            TEvent,
            AnyActorSystem,
            TEmitted
        >
    ): MachineSnapshot<
        TContext,
        TEvent,
        TChildren,
        TStateValue,
        TTag,
        TOutput,
        TMeta,
        TStateSchema
    >;
    /**
     * Determines the next state given the current `state` and `event`. Calculates
     * a microstep.
     *
     * @param state The current state
     * @param event The received event
     */
    microstep(
        snapshot: MachineSnapshot<
            TContext,
            TEvent,
            TChildren,
            TStateValue,
            TTag,
            TOutput,
            TMeta,
            TStateSchema
        >,
        event: TEvent,
        actorScope: AnyActorScope
    ): Array<
        MachineSnapshot<
            TContext,
            TEvent,
            TChildren,
            TStateValue,
            TTag,
            TOutput,
            TMeta,
            TStateSchema
        >
    >;
    getTransitionData(
        snapshot: MachineSnapshot<
            TContext,
            TEvent,
            TChildren,
            TStateValue,
            TTag,
            TOutput,
            TMeta,
            TStateSchema
        >,
        event: TEvent
    ): Array<TransitionDefinition<TContext, TEvent>>;
    /**
     * The initial state _before_ evaluating any microsteps. This "pre-initial"
     * state is provided to initial actions executed in the initial state.
     */
    private getPreInitialState;
    /**
     * Returns the initial `State` instance, with reference to `self` as an
     * `ActorRef`.
     */
    getInitialSnapshot(
        actorScope: ActorScope<
            MachineSnapshot<
                TContext,
                TEvent,
                TChildren,
                TStateValue,
                TTag,
                TOutput,
                TMeta,
                TStateSchema
            >,
            TEvent,
            AnyActorSystem,
            TEmitted
        >,
        input?: TInput
    ): MachineSnapshot<
        TContext,
        TEvent,
        TChildren,
        TStateValue,
        TTag,
        TOutput,
        TMeta,
        TStateSchema
    >;
    start(
        snapshot: MachineSnapshot<
            TContext,
            TEvent,
            TChildren,
            TStateValue,
            TTag,
            TOutput,
            TMeta,
            TStateSchema
        >
    ): void;
    getStateNodeById(stateId: string): StateNode<TContext, TEvent>;
    get definition(): StateMachineDefinition<TContext, TEvent>;
    toJSON(): StateMachineDefinition<TContext, TEvent>;
    getPersistedSnapshot(
        snapshot: MachineSnapshot<
            TContext,
            TEvent,
            TChildren,
            TStateValue,
            TTag,
            TOutput,
            TMeta,
            TStateSchema
        >,
        options?: unknown
    ): Snapshot<unknown>;
    restoreSnapshot(
        snapshot: Snapshot<unknown>,
        _actorScope: ActorScope<
            MachineSnapshot<
                TContext,
                TEvent,
                TChildren,
                TStateValue,
                TTag,
                TOutput,
                TMeta,
                TStateSchema
            >,
            TEvent,
            AnyActorSystem,
            TEmitted
        >
    ): MachineSnapshot<
        TContext,
        TEvent,
        TChildren,
        TStateValue,
        TTag,
        TOutput,
        TMeta,
        TStateSchema
    >;
}

interface StateNodeOptions<
    TContext extends MachineContext,
    TEvent extends EventObject,
> {
    _key: string;
    _parent?: StateNode<TContext, TEvent>;
    _machine: AnyStateMachine;
}
declare class StateNode<
    TContext extends MachineContext = MachineContext,
    TEvent extends EventObject = EventObject,
> {
    /** The raw config used to create the machine. */
    config: StateNodeConfig<
        TContext,
        TEvent,
        TODO, // actors
        TODO, // actions
        TODO, // guards
        TODO, // delays
        TODO, // tags
        TODO, // output
        TODO, // emitted
        TODO
    >;
    /**
     * The relative key of the state node, which represents its location in the
     * overall state value.
     */
    key: string;
    /** The unique ID of the state node. */
    id: string;
    /**
     * The type of this state node:
     *
     * - `'atomic'` - no child state nodes
     * - `'compound'` - nested child state nodes (XOR)
     * - `'parallel'` - orthogonal nested child state nodes (AND)
     * - `'history'` - history state node
     * - `'final'` - final state node
     */
    type: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
    /** The string path from the root machine node to this node. */
    path: string[];
    /** The child state nodes. */
    states: StateNodesConfig<TContext, TEvent>;
    /**
     * The type of history on this state node. Can be:
     *
     * - `'shallow'` - recalls only top-level historical state value
     * - `'deep'` - recalls historical state value at all levels
     */
    history: false | 'shallow' | 'deep';
    /** The action(s) to be executed upon entering the state node. */
    entry: UnknownAction[];
    /** The action(s) to be executed upon exiting the state node. */
    exit: UnknownAction[];
    /** The parent state node. */
    parent?: StateNode<TContext, TEvent>;
    /** The root machine node. */
    machine: StateMachine<
        TContext,
        TEvent,
        any, // children
        any, // actor
        any, // action
        any, // guard
        any, // delay
        any, // state value
        any, // tag
        any, // input
        any, // output
        any, // emitted
        any, // meta
        any
    >;
    /**
     * The meta data associated with this state node, which will be returned in
     * State instances.
     */
    meta?: any;
    /**
     * The output data sent with the "xstate.done.state._id_" event if this is a
     * final state node.
     */
    output?:
        | Mapper<MachineContext, EventObject, unknown, EventObject>
        | NonReducibleUnknown;
    /**
     * The order this state node appears. Corresponds to the implicit document
     * order.
     */
    order: number;
    description?: string;
    tags: string[];
    transitions: Map<string, TransitionDefinition<TContext, TEvent>[]>;
    always?: Array<TransitionDefinition<TContext, TEvent>>;
    constructor(
        /** The raw config used to create the machine. */
        config: StateNodeConfig<
            TContext,
            TEvent,
            TODO, // actors
            TODO, // actions
            TODO, // guards
            TODO, // delays
            TODO, // tags
            TODO, // output
            TODO, // emitted
            TODO
        >,
        options: StateNodeOptions<TContext, TEvent>
    );
    /** The well-structured state node definition. */
    get definition(): StateNodeDefinition<TContext, TEvent>;
    /** The logic invoked as actors by this state node. */
    get invoke(): Array<
        InvokeDefinition<
            TContext,
            TEvent,
            ProvidedActor,
            ParameterizedObject,
            ParameterizedObject,
            string,
            TODO, // TEmitted
            TODO
        >
    >;
    /** The mapping of events to transitions. */
    get on(): TransitionDefinitionMap<TContext, TEvent>;
    get after(): Array<DelayedTransitionDefinition<TContext, TEvent>>;
    get initial(): InitialTransitionDefinition<TContext, TEvent>;
    /** All the event types accepted by this state node and its descendants. */
    get events(): Array<EventDescriptor<TEvent>>;
    /**
     * All the events that have transitions directly from this state node.
     *
     * Excludes any inert events.
     */
    get ownEvents(): Array<EventDescriptor<TEvent>>;
}

type ToTestStateValue<TStateValue extends StateValue> =
    TStateValue extends string
        ? TStateValue
        : IsNever<keyof TStateValue> extends true
          ? never
          :
                | keyof TStateValue
                | {
                      [K in keyof TStateValue]?: ToTestStateValue<
                          NonNullable<TStateValue[K]>
                      >;
                  };
declare function isMachineSnapshot(value: unknown): value is AnyMachineSnapshot;
interface MachineSnapshotBase<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TStateValue extends StateValue,
    TTag extends string,
    TOutput,
    TMeta,
    TStateSchema extends StateSchema = StateSchema,
> {
    /** The state machine that produced this state snapshot. */
    machine: StateMachine<
        TContext,
        TEvent,
        TChildren,
        ProvidedActor,
        ParameterizedObject,
        ParameterizedObject,
        string,
        TStateValue,
        TTag,
        unknown,
        TOutput,
        EventObject, // TEmitted
        any, // TMeta
        TStateSchema
    >;
    /** The tags of the active state nodes that represent the current state value. */
    tags: Set<string>;
    /**
     * The current state value.
     *
     * This represents the active state nodes in the state machine.
     *
     * - For atomic state nodes, it is a string.
     * - For compound parent state nodes, it is an object where:
     *
     *   - The key is the parent state node's key
     *   - The value is the current state value of the active child state node(s)
     *
     * @example
     *
     * ```ts
     * // single-level state node
     * snapshot.value; // => 'yellow'
     *
     * // nested state nodes
     * snapshot.value; // => { red: 'wait' }
     * ```
     */
    value: TStateValue;
    /** The current status of this snapshot. */
    status: SnapshotStatus;
    error: unknown;
    context: TContext;
    historyValue: Readonly<HistoryValue<TContext, TEvent>>;
    /** The enabled state nodes representative of the state value. */
    _nodes: Array<StateNode<TContext, TEvent>>;
    /** An object mapping actor names to spawned/invoked actors. */
    children: TChildren;
    /**
     * Whether the current state value is a subset of the given partial state
     * value.
     *
     * @param partialStateValue
     */
    matches: (partialStateValue: ToTestStateValue<TStateValue>) => boolean;
    /**
     * Whether the current state nodes has a state node with the specified `tag`.
     *
     * @param tag
     */
    hasTag: (tag: TTag) => boolean;
    /**
     * Determines whether sending the `event` will cause a non-forbidden
     * transition to be selected, even if the transitions have no actions nor
     * change the state value.
     *
     * @param event The event to test
     * @returns Whether the event will cause a transition
     */
    can: (event: TEvent) => boolean;
    getMeta: () => Record<StateId<TStateSchema> & string, TMeta | undefined>;
    toJSON: () => unknown;
}
interface ActiveMachineSnapshot<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TStateValue extends StateValue,
    TTag extends string,
    TOutput,
    TMeta extends MetaObject,
    TStateSchema extends StateSchema,
> extends MachineSnapshotBase<
    TContext,
    TEvent,
    TChildren,
    TStateValue,
    TTag,
    TOutput,
    TMeta,
    TStateSchema
> {
    status: 'active';
    output: undefined;
    error: undefined;
}
interface DoneMachineSnapshot<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TStateValue extends StateValue,
    TTag extends string,
    TOutput,
    TMeta extends MetaObject,
    TStateSchema extends StateSchema,
> extends MachineSnapshotBase<
    TContext,
    TEvent,
    TChildren,
    TStateValue,
    TTag,
    TOutput,
    TMeta,
    TStateSchema
> {
    status: 'done';
    output: TOutput;
    error: undefined;
}
interface ErrorMachineSnapshot<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TStateValue extends StateValue,
    TTag extends string,
    TOutput,
    TMeta extends MetaObject,
    TStateSchema extends StateSchema,
> extends MachineSnapshotBase<
    TContext,
    TEvent,
    TChildren,
    TStateValue,
    TTag,
    TOutput,
    TMeta,
    TStateSchema
> {
    status: 'error';
    output: undefined;
    error: unknown;
}
interface StoppedMachineSnapshot<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TStateValue extends StateValue,
    TTag extends string,
    TOutput,
    TMeta extends MetaObject,
    TStateSchema extends StateSchema,
> extends MachineSnapshotBase<
    TContext,
    TEvent,
    TChildren,
    TStateValue,
    TTag,
    TOutput,
    TMeta,
    TStateSchema
> {
    status: 'stopped';
    output: undefined;
    error: undefined;
}
type MachineSnapshot<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildren extends Record<string, AnyActorRef | undefined>,
    TStateValue extends StateValue,
    TTag extends string,
    TOutput,
    TMeta extends MetaObject,
    TStateSchema extends StateSchema,
> =
    | ActiveMachineSnapshot<
          TContext,
          TEvent,
          TChildren,
          TStateValue,
          TTag,
          TOutput,
          TMeta,
          TStateSchema
      >
    | DoneMachineSnapshot<
          TContext,
          TEvent,
          TChildren,
          TStateValue,
          TTag,
          TOutput,
          TMeta,
          TStateSchema
      >
    | ErrorMachineSnapshot<
          TContext,
          TEvent,
          TChildren,
          TStateValue,
          TTag,
          TOutput,
          TMeta,
          TStateSchema
      >
    | StoppedMachineSnapshot<
          TContext,
          TEvent,
          TChildren,
          TStateValue,
          TTag,
          TOutput,
          TMeta,
          TStateSchema
      >;

interface RaiseAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TDelay extends string,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TEvent?: TEvent;
    _out_TDelay?: TDelay;
}
/**
 * Raises an event. This places the event in the internal event queue, so that
 * the event is immediately consumed by the machine in the current step.
 *
 * @param eventType The event to raise.
 */
declare function raise<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TDelay extends string = never,
    TUsedDelay extends TDelay = never,
>(
    eventOrExpr:
        | DoNotInfer<TEvent>
        | SendExpr<
              TContext,
              TExpressionEvent,
              TParams,
              DoNotInfer<TEvent>,
              TEvent
          >,
    options?: RaiseActionOptions<
        TContext,
        TExpressionEvent,
        TParams,
        DoNotInfer<TEvent>,
        TUsedDelay
    >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    never,
    never,
    never,
    TDelay,
    never
>;
interface ExecutableRaiseAction extends ExecutableActionObject {
    type: 'xstate.raise';
    params: {
        event: EventObject;
        id: string | undefined;
        delay: number | undefined;
    };
}

interface SendToAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TDelay extends string,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TDelay?: TDelay;
}
/**
 * Sends an event to an actor.
 *
 * @param actor The `ActorRef` to send the event to.
 * @param event The event to send, or an expression that evaluates to the event
 *   to send
 * @param options Send action options
 *
 *   - `id` - The unique send event identifier (used with `cancel()`).
 *   - `delay` - The number of milliseconds to delay the sending of the event.
 */
declare function sendTo<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TTargetActor extends AnyActorRef,
    TEvent extends EventObject,
    TDelay extends string = never,
    TUsedDelay extends TDelay = never,
>(
    to: SendToActionTarget<
        TContext,
        TExpressionEvent,
        TParams,
        TTargetActor,
        TEvent
    >,
    eventOrExpr:
        | EventFrom<TTargetActor>
        | SendExpr<
              TContext,
              TExpressionEvent,
              TParams,
              InferEvent<Cast<EventFrom<TTargetActor>, EventObject>>,
              TEvent
          >,
    options?: SendToActionOptions<
        TContext,
        TExpressionEvent,
        TParams,
        DoNotInfer<TEvent>,
        TUsedDelay
    >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    never,
    never,
    never,
    TDelay,
    never
>;
/**
 * Sends an event to this machine's parent.
 *
 * @param event The event to send to the parent machine.
 * @param options Options to pass into the send event.
 */
declare function sendParent<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TSentEvent extends EventObject = AnyEventObject,
    TEvent extends EventObject = AnyEventObject,
    TDelay extends string = never,
    TUsedDelay extends TDelay = never,
>(
    event:
        | TSentEvent
        | SendExpr<TContext, TExpressionEvent, TParams, TSentEvent, TEvent>,
    options?: SendToActionOptions<
        TContext,
        TExpressionEvent,
        TParams,
        TEvent,
        TUsedDelay
    >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    never,
    never,
    never,
    TDelay,
    never
>;
type SendToActionTarget<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TTargetActor extends AnyActorRef,
    TEvent extends EventObject,
> =
    | string
    | TTargetActor
    | ((
          args: ActionArgs<TContext, TExpressionEvent, TEvent>,
          params: TParams
      ) => string | TTargetActor);
/**
 * Forwards (sends) an event to the `target` actor.
 *
 * @param target The target actor to forward the event to.
 * @param options Options to pass into the send action creator.
 */
declare function forwardTo<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TDelay extends string = never,
    TUsedDelay extends TDelay = never,
>(
    target: SendToActionTarget<
        TContext,
        TExpressionEvent,
        TParams,
        AnyActorRef,
        TEvent
    >,
    options?: SendToActionOptions<
        TContext,
        TExpressionEvent,
        TParams,
        TEvent,
        TUsedDelay
    >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    never,
    never,
    never,
    TDelay,
    never
>;
interface ExecutableSendToAction extends ExecutableActionObject {
    type: 'xstate.sendTo';
    params: {
        event: EventObject;
        id: string | undefined;
        delay: number | undefined;
        to: AnyActorRef;
    };
}

type PromiseSnapshot<TOutput, TInput> = Snapshot<TOutput> & {
    input: TInput | undefined;
};
type PromiseActorLogic<
    TOutput,
    TInput = unknown,
    TEmitted extends EventObject = EventObject,
> = ActorLogic<
    PromiseSnapshot<TOutput, TInput>,
    {
        type: string;
        [k: string]: unknown;
    },
    TInput, // input
    AnyActorSystem,
    TEmitted
>;
/**
 * Represents an actor created by `fromPromise`.
 *
 * The type of `self` within the actor's logic.
 *
 * @example
 *
 * ```ts
 * import { fromPromise, createActor } from 'xstate';
 *
 * // The actor's resolved output
 * type Output = string;
 * // The actor's input.
 * type Input = { message: string };
 *
 * // Actor logic that fetches the url of an image of a cat saying `input.message`.
 * const logic = fromPromise<Output, Input>(async ({ input, self }) => {
 *   self;
 *   // ^? PromiseActorRef<Output, Input>
 *
 *   const data = await fetch(
 *     `https://cataas.com/cat/says/${input.message}`
 *   );
 *   const url = await data.json();
 *   return url;
 * });
 *
 * const actor = createActor(logic, { input: { message: 'hello world' } });
 * //    ^? PromiseActorRef<Output, Input>
 * ```
 *
 * @see {@link fromPromise}
 */
type PromiseActorRef<TOutput> = ActorRefFromLogic<
    PromiseActorLogic<TOutput, unknown>
>;
/**
 * An actor logic creator which returns promise logic as defined by an async
 * process that resolves or rejects after some time.
 *
 * Actors created from promise actor logic (“promise actors”) can:
 *
 * - Emit the resolved value of the promise
 * - Output the resolved value of the promise
 *
 * Sending events to promise actors will have no effect.
 *
 * @example
 *
 * ```ts
 * const promiseLogic = fromPromise(async () => {
 *   const result = await fetch('https://example.com/...').then((data) =>
 *     data.json()
 *   );
 *
 *   return result;
 * });
 *
 * const promiseActor = createActor(promiseLogic);
 * promiseActor.subscribe((snapshot) => {
 *   console.log(snapshot);
 * });
 * promiseActor.start();
 * // => {
 * //   output: undefined,
 * //   status: 'active'
 * //   ...
 * // }
 *
 * // After promise resolves
 * // => {
 * //   output: { ... },
 * //   status: 'done',
 * //   ...
 * // }
 * ```
 *
 * @param promiseCreator A function which returns a Promise, and accepts an
 *   object with the following properties:
 *
 *   - `input` - Data that was provided to the promise actor
 *   - `self` - The parent actor of the promise actor
 *   - `system` - The actor system to which the promise actor belongs
 *
 * @see {@link https://stately.ai/docs/input | Input docs} for more information about how input is passed
 */
declare function fromPromise<
    TOutput,
    TInput = NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
>(
    promiseCreator: ({
        input,
        system,
        self,
        signal,
        emit,
    }: {
        /** Data that was provided to the promise actor */
        input: TInput;
        /** The actor system to which the promise actor belongs */
        system: AnyActorSystem;
        /** The parent actor of the promise actor */
        self: PromiseActorRef<TOutput>;
        signal: AbortSignal;
        emit: (emitted: TEmitted) => void;
    }) => PromiseLike<TOutput>
): PromiseActorLogic<TOutput, TInput, TEmitted>;

declare const symbolObservable: typeof Symbol.observable;

/**
 * An Actor is a running process that can receive events, send events and change
 * its behavior based on the events it receives, which can cause effects outside
 * of the actor. When you run a state machine, it becomes an actor.
 */
declare class Actor<TLogic extends AnyActorLogic> implements ActorRef<
    SnapshotFrom<TLogic>,
    EventFromLogic<TLogic>,
    EmittedFrom<TLogic>
> {
    logic: TLogic;
    /** The current internal state of the actor. */
    private _snapshot;
    /**
     * The clock that is responsible for setting and clearing timeouts, such as
     * delayed events and transitions.
     */
    clock: Clock;
    options: Readonly<ActorOptions<TLogic>>;
    /** The unique identifier for this actor relative to its parent. */
    id: string;
    private mailbox;
    private observers;
    private eventListeners;
    private logger;
    _parent?: AnyActorRef;
    ref: ActorRef<
        SnapshotFrom<TLogic>,
        EventFromLogic<TLogic>,
        EmittedFrom<TLogic>
    >;
    private _actorScope;
    systemId: string | undefined;
    /** The globally unique process ID for this invocation. */
    sessionId: string;
    /** The system to which this actor belongs. */
    system: AnyActorSystem;
    private _doneEvent?;
    src: string | AnyActorLogic;
    /**
     * Creates a new actor instance for the given logic with the provided options,
     * if any.
     *
     * @param logic The logic to create an actor from
     * @param options Actor options
     */
    constructor(logic: TLogic, options?: ActorOptions<TLogic>);
    private _initState;
    private _deferred;
    private update;
    /**
     * Subscribe an observer to an actor’s snapshot values.
     *
     * @remarks
     * The observer will receive the actor’s snapshot value when it is emitted.
     * The observer can be:
     *
     * - A plain function that receives the latest snapshot, or
     * - An observer object whose `.next(snapshot)` method receives the latest
     *   snapshot
     *
     * @example
     *
     * ```ts
     * // Observer as a plain function
     * const subscription = actor.subscribe((snapshot) => {
     *   console.log(snapshot);
     * });
     * ```
     *
     * @example
     *
     * ```ts
     * // Observer as an object
     * const subscription = actor.subscribe({
     *   next(snapshot) {
     *     console.log(snapshot);
     *   },
     *   error(err) {
     *     // ...
     *   },
     *   complete() {
     *     // ...
     *   }
     * });
     * ```
     *
     * The return value of `actor.subscribe(observer)` is a subscription object
     * that has an `.unsubscribe()` method. You can call
     * `subscription.unsubscribe()` to unsubscribe the observer:
     *
     * @example
     *
     * ```ts
     * const subscription = actor.subscribe((snapshot) => {
     *   // ...
     * });
     *
     * // Unsubscribe the observer
     * subscription.unsubscribe();
     * ```
     *
     * When the actor is stopped, all of its observers will automatically be
     * unsubscribed.
     *
     * @param observer - Either a plain function that receives the latest
     *   snapshot, or an observer object whose `.next(snapshot)` method receives
     *   the latest snapshot
     */
    subscribe(observer: Observer<SnapshotFrom<TLogic>>): Subscription;
    subscribe(
        nextListener?: (snapshot: SnapshotFrom<TLogic>) => void,
        errorListener?: (error: any) => void,
        completeListener?: () => void
    ): Subscription;
    on<TType extends EmittedFrom<TLogic>['type'] | '*'>(
        type: TType,
        handler: (
            emitted: EmittedFrom<TLogic> &
                (TType extends '*'
                    ? unknown
                    : {
                          type: TType;
                      })
        ) => void
    ): Subscription;
    /** Starts the Actor from the initial state */
    start(): this;
    private _process;
    private _stop;
    /** Stops the Actor and unsubscribe all listeners. */
    stop(): this;
    private _complete;
    private _reportError;
    private _error;
    private _stopProcedure;
    /**
     * Sends an event to the running Actor to trigger a transition.
     *
     * @param event The event to send
     */
    send(event: EventFromLogic<TLogic>): void;
    private attachDevTools;
    toJSON(): {
        xstate$$type: number;
        id: string;
    };
    /**
     * Obtain the internal state of the actor, which can be persisted.
     *
     * @remarks
     * The internal state can be persisted from any actor, not only machines.
     *
     * Note that the persisted state is not the same as the snapshot from
     * {@link Actor.getSnapshot}. Persisted state represents the internal state of
     * the actor, while snapshots represent the actor's last emitted value.
     *
     * Can be restored with {@link ActorOptions.state}
     * @see https://stately.ai/docs/persistence
     */
    getPersistedSnapshot(): Snapshot<unknown>;
    [symbolObservable](): InteropSubscribable<SnapshotFrom<TLogic>>;
    /**
     * Read an actor’s snapshot synchronously.
     *
     * @remarks
     * The snapshot represent an actor's last emitted value.
     *
     * When an actor receives an event, its internal state may change. An actor
     * may emit a snapshot when a state transition occurs.
     *
     * Note that some actors, such as callback actors generated with
     * `fromCallback`, will not emit snapshots.
     * @see {@link Actor.subscribe} to subscribe to an actor’s snapshot values.
     * @see {@link Actor.getPersistedSnapshot} to persist the internal state of an actor (which is more than just a snapshot).
     */
    getSnapshot(): SnapshotFrom<TLogic>;
}
type RequiredActorOptionsKeys<TLogic extends AnyActorLogic> =
    undefined extends InputFrom<TLogic> ? never : 'input';
/**
 * Creates a new actor instance for the given actor logic with the provided
 * options, if any.
 *
 * @remarks
 * When you create an actor from actor logic via `createActor(logic)`, you
 * implicitly create an actor system where the created actor is the root actor.
 * Any actors spawned from this root actor and its descendants are part of that
 * actor system.
 * @example
 *
 * ```ts
 * import { createActor } from 'xstate';
 * import { someActorLogic } from './someActorLogic.ts';
 *
 * // Creating the actor, which implicitly creates an actor system with itself as the root actor
 * const actor = createActor(someActorLogic);
 *
 * actor.subscribe((snapshot) => {
 *   console.log(snapshot);
 * });
 *
 * // Actors must be started by calling `actor.start()`, which will also start the actor system.
 * actor.start();
 *
 * // Actors can receive events
 * actor.send({ type: 'someEvent' });
 *
 * // You can stop root actors by calling `actor.stop()`, which will also stop the actor system and all actors in that system.
 * actor.stop();
 * ```
 *
 * @param logic - The actor logic to create an actor from. For a state machine
 *   actor logic creator, see {@link createMachine}. Other actor logic creators
 *   include {@link fromCallback}, {@link fromEventObservable},
 *   {@link fromObservable}, {@link fromPromise}, and {@link fromTransition}.
 * @param options - Actor options
 */
declare function createActor<TLogic extends AnyActorLogic>(
    logic: TLogic,
    ...[options]: ConditionalRequired<
        [
            options?: ActorOptions<TLogic> & {
                [K in RequiredActorOptionsKeys<TLogic>]: unknown;
            },
        ],
        IsNotNever<RequiredActorOptionsKeys<TLogic>>
    >
): Actor<TLogic>;
/**
 * Creates a new Interpreter instance for the given machine with the provided
 * options, if any.
 *
 * @deprecated Use `createActor` instead
 * @alias
 */
declare const interpret: typeof createActor;
/**
 * @deprecated Use `Actor` instead.
 * @alias
 */
type Interpreter = typeof Actor;

type SingleGuardArg<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TGuardArg,
> = [TGuardArg] extends [
    {
        type: string;
    },
]
    ? Identity<TGuardArg>
    : [TGuardArg] extends [string]
      ? TGuardArg
      : GuardPredicate<
            TContext,
            TExpressionEvent,
            TParams,
            ParameterizedObject
        >;
type NormalizeGuardArg<TGuardArg> = TGuardArg extends {
    type: string;
}
    ? Identity<TGuardArg> & {
          params: unknown;
      }
    : TGuardArg extends string
      ? {
            type: TGuardArg;
            params: undefined;
        }
      : '_out_TGuard' extends keyof TGuardArg
        ? TGuardArg['_out_TGuard'] & ParameterizedObject
        : never;
type NormalizeGuardArgArray<TArg extends unknown[]> = Elements<{
    [K in keyof TArg]: NormalizeGuardArg<TArg[K]>;
}>;
type GuardPredicate<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TGuard extends ParameterizedObject,
> = {
    (args: GuardArgs<TContext, TExpressionEvent>, params: TParams): boolean;
    _out_TGuard?: TGuard;
};
interface GuardArgs<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
> {
    context: TContext;
    event: TExpressionEvent;
}
type Guard<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TGuard extends ParameterizedObject,
> =
    | NoRequiredParams<TGuard>
    | WithDynamicParams<TContext, TExpressionEvent, TGuard>
    | GuardPredicate<TContext, TExpressionEvent, TParams, TGuard>;
type UnknownGuard = UnknownReferencedGuard | UnknownInlineGuard;
type UnknownReferencedGuard = Guard<
    MachineContext,
    EventObject,
    ParameterizedObject['params'],
    ParameterizedObject
>;
type UnknownInlineGuard = Guard<
    MachineContext,
    EventObject,
    undefined,
    ParameterizedObject
>;
declare function stateIn<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
>(
    stateValue: StateValue
): GuardPredicate<TContext, TExpressionEvent, TParams, any>;
/**
 * Higher-order guard that evaluates to `true` if the `guard` passed to it
 * evaluates to `false`.
 *
 * @category Guards
 * @example
 *
 * ```ts
 * import { setup, not } from 'xstate';
 *
 * const machine = setup({
 *   guards: {
 *     someNamedGuard: () => false
 *   }
 * }).createMachine({
 *   on: {
 *     someEvent: {
 *       guard: not('someNamedGuard'),
 *       actions: () => {
 *         // will be executed if guard in `not(...)`
 *         // evaluates to `false`
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @returns A guard
 */
declare function not<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TArg,
>(
    guard: SingleGuardArg<TContext, TExpressionEvent, unknown, TArg>
): GuardPredicate<
    TContext,
    TExpressionEvent,
    unknown,
    NormalizeGuardArg<DoNotInfer<TArg>>
>;
/**
 * Higher-order guard that evaluates to `true` if all `guards` passed to it
 * evaluate to `true`.
 *
 * @category Guards
 * @example
 *
 * ```ts
 * import { setup, and } from 'xstate';
 *
 * const machine = setup({
 *   guards: {
 *     someNamedGuard: () => true
 *   }
 * }).createMachine({
 *   on: {
 *     someEvent: {
 *       guard: and([({ context }) => context.value > 0, 'someNamedGuard']),
 *       actions: () => {
 *         // will be executed if all guards in `and(...)`
 *         // evaluate to true
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @returns A guard action object
 */
declare function and<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TArg extends unknown[],
>(
    guards: readonly [
        ...{
            [K in keyof TArg]: SingleGuardArg<
                TContext,
                TExpressionEvent,
                unknown,
                TArg[K]
            >;
        },
    ]
): GuardPredicate<
    TContext,
    TExpressionEvent,
    unknown,
    NormalizeGuardArgArray<DoNotInfer<TArg>>
>;
/**
 * Higher-order guard that evaluates to `true` if any of the `guards` passed to
 * it evaluate to `true`.
 *
 * @category Guards
 * @example
 *
 * ```ts
 * import { setup, or } from 'xstate';
 *
 * const machine = setup({
 *   guards: {
 *     someNamedGuard: () => true
 *   }
 * }).createMachine({
 *   on: {
 *     someEvent: {
 *       guard: or([({ context }) => context.value > 0, 'someNamedGuard']),
 *       actions: () => {
 *         // will be executed if any of the guards in `or(...)`
 *         // evaluate to true
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @returns A guard action object
 */
declare function or<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TArg extends unknown[],
>(
    guards: readonly [
        ...{
            [K in keyof TArg]: SingleGuardArg<
                TContext,
                TExpressionEvent,
                unknown,
                TArg[K]
            >;
        },
    ]
): GuardPredicate<
    TContext,
    TExpressionEvent,
    unknown,
    NormalizeGuardArgArray<DoNotInfer<TArg>>
>;

type Identity<T> = {
    [K in keyof T]: T[K];
};
type HomomorphicPick<T, K extends keyof any> = {
    [P in keyof T as P & K]: T[P];
};
type HomomorphicOmit<T, K extends keyof any> = {
    [P in keyof T as Exclude<P, K>]: T[P];
};
type Invert<T extends Record<PropertyKey, PropertyKey>> = {
    [K in keyof T as T[K]]: K;
};
type GetParameterizedParams<T extends ParameterizedObject | undefined> =
    T extends any
        ? 'params' extends keyof T
            ? T['params']
            : undefined
        : never;
/**
 * @remarks
 * `T | unknown` reduces to `unknown` and that can be problematic when it comes
 * to contextual typing. It especially is a problem when the union has a
 * function member, like here:
 *
 * ```ts
 * declare function test(
 *   cbOrVal: ((arg: number) => unknown) | unknown
 * ): void;
 * test((arg) => {}); // oops, implicit any
 * ```
 *
 * This type can be used to avoid this problem. This union represents the same
 * value space as `unknown`.
 */
type NonReducibleUnknown = {} | null | undefined;
type AnyFunction = (...args: any[]) => any;
type ReturnTypeOrValue<T> = T extends AnyFunction ? ReturnType<T> : T;
type IsNever<T> = [T] extends [never] ? true : false;
type IsNotNever<T> = [T] extends [never] ? false : true;
type Compute<A> = {
    [K in keyof A]: A[K];
} & unknown;
type Prop<T, K> = K extends keyof T ? T[K] : never;
type Values<T> = T[keyof T];
type Elements<T> = T[keyof T & `${number}`];
type Merge<M, N> = Omit<M, keyof N> & N;
type IndexByProp<T extends Record<P, string>, P extends keyof T> = {
    [E in T as E[P]]: E;
};
type IndexByType<
    T extends {
        type: string;
    },
> = IndexByProp<T, 'type'>;
type Equals<A1, A2> =
    (<A>() => A extends A2 ? true : false) extends <A>() => A extends A1
        ? true
        : false
        ? true
        : false;
type IsAny<T> = Equals<T, any>;
type Cast<A, B> = A extends B ? A : B;
type DoNotInfer<T> = [T][T extends any ? 0 : any];
/** @deprecated Use the built-in `NoInfer` type instead */
type NoInfer<T> = DoNotInfer<T>;
type LowInfer<T> = T & NonNullable<unknown>;
type MetaObject = Record<string, any>;
type Lazy<T> = () => T;
type MaybeLazy<T> = T | Lazy<T>;
/** The full definition of an event, with a string `type`. */
type EventObject = {
    /** The type of event that is sent. */
    type: string;
};
interface AnyEventObject extends EventObject {
    [key: string]: any;
}
interface ParameterizedObject {
    type: string;
    params?: NonReducibleUnknown;
}
interface UnifiedArg<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
> {
    context: TContext;
    event: TExpressionEvent;
    self: ActorRef<
        MachineSnapshot<
            TContext,
            TEvent,
            Record<string, AnyActorRef | undefined>, // TODO: this should be replaced with `TChildren`
            StateValue,
            string,
            unknown,
            TODO, // TMeta
            TODO
        >,
        TEvent,
        AnyEventObject
    >;
    system: AnyActorSystem;
}
type MachineContext = Record<string, any>;
interface ActionArgs<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
> extends UnifiedArg<TContext, TExpressionEvent, TEvent> {}
type InputFrom<T> =
    T extends StateMachine<
        infer _TContext,
        infer _TEvent,
        infer _TChildren,
        infer _TActor,
        infer _TAction,
        infer _TGuard,
        infer _TDelay,
        infer _TStateValue,
        infer _TTag,
        infer TInput,
        infer _TOutput,
        infer _TEmitted,
        infer _TMeta,
        infer _TStateSchema
    >
        ? TInput
        : T extends ActorLogic<
                infer _TSnapshot,
                infer _TEvent,
                infer TInput,
                infer _TSystem,
                infer _TEmitted
            >
          ? TInput
          : never;
type OutputFrom<T> =
    T extends ActorLogic<
        infer TSnapshot,
        infer _TEvent,
        infer _TInput,
        infer _TSystem,
        infer _TEmitted
    >
        ? (TSnapshot & {
              status: 'done';
          })['output']
        : T extends ActorRef<infer TSnapshot, infer _TEvent, infer _TEmitted>
          ? (TSnapshot & {
                status: 'done';
            })['output']
          : never;
type ActionFunction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
> = {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TEvent?: TEvent;
    _out_TActor?: TActor;
    _out_TAction?: TAction;
    _out_TGuard?: TGuard;
    _out_TDelay?: TDelay;
    _out_TEmitted?: TEmitted;
};
type NoRequiredParams<T extends ParameterizedObject> = T extends any
    ? undefined extends T['params']
        ? T['type']
        : never
    : never;
type ConditionalRequired<T, Condition extends boolean> = Condition extends true
    ? Required<T>
    : T;
type WithDynamicParams<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    T extends ParameterizedObject,
> = T extends any
    ? ConditionalRequired<
          {
              type: T['type'];
              params?:
                  | T['params']
                  | (({
                        context,
                        event,
                    }: {
                        context: TContext;
                        event: TExpressionEvent;
                    }) => T['params']);
          },
          undefined extends T['params'] ? false : true
      >
    : never;
type Action<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
> =
    | NoRequiredParams<TAction>
    | WithDynamicParams<TContext, TExpressionEvent, TAction>
    | ActionFunction<
          TContext,
          TExpressionEvent,
          TEvent,
          TParams,
          TActor,
          TAction,
          TGuard,
          TDelay,
          TEmitted
      >;
type UnknownAction = Action<
    MachineContext,
    EventObject,
    EventObject,
    ParameterizedObject['params'] | undefined,
    ProvidedActor,
    ParameterizedObject,
    ParameterizedObject,
    string,
    EventObject
>;
type Actions<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
> = SingleOrArray<
    Action<
        TContext,
        TExpressionEvent,
        TEvent,
        TParams,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >
>;
type StateKey = string | AnyMachineSnapshot;
interface StateValueMap {
    [key: string]: StateValue | undefined;
}
/**
 * The string or object representing the state value relative to the parent
 * state node.
 *
 * @remarks
 * - For a child atomic state node, this is a string, e.g., `"pending"`.
 * - For complex state nodes, this is an object, e.g., `{ success:
 *   "someChildState" }`.
 */
type StateValue = string | StateValueMap;
type TransitionTarget = SingleOrArray<string>;
interface TransitionConfig<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject = EventObject,
    TMeta extends MetaObject = MetaObject,
> {
    guard?: Guard<TContext, TExpressionEvent, undefined, TGuard>;
    actions?: Actions<
        TContext,
        TExpressionEvent,
        TEvent,
        undefined,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >;
    reenter?: boolean;
    target?: TransitionTarget | undefined;
    meta?: TMeta;
    description?: string;
}
interface InitialTransitionConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
> extends TransitionConfig<
    TContext,
    TEvent,
    TEvent,
    TActor,
    TAction,
    TGuard,
    TDelay,
    TODO, // TEmitted
    TODO
> {
    target: string;
}
type AnyTransitionConfig = TransitionConfig<
    any, // TContext
    any, // TExpressionEvent
    any, // TEvent
    any, // TActor
    any, // TAction
    any, // TGuard
    any, // TDelay
    any, // TEmitted
    any
>;
interface InvokeDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> {
    id: string;
    systemId: string | undefined;
    /** The source of the actor logic to be invoked */
    src: AnyActorLogic | string;
    input?:
        | Mapper<TContext, TEvent, NonReducibleUnknown, TEvent>
        | NonReducibleUnknown;
    /**
     * The transition to take upon the invoked child machine reaching its final
     * top-level state.
     */
    onDone?:
        | string
        | SingleOrArray<
              TransitionConfig<
                  TContext,
                  DoneActorEvent<unknown>,
                  TEvent,
                  TActor,
                  TAction,
                  TGuard,
                  TDelay,
                  TEmitted,
                  TMeta
              >
          >;
    /**
     * The transition to take upon the invoked child machine sending an error
     * event.
     */
    onError?:
        | string
        | SingleOrArray<
              TransitionConfig<
                  TContext,
                  ErrorActorEvent,
                  TEvent,
                  TActor,
                  TAction,
                  TGuard,
                  TDelay,
                  TEmitted,
                  TMeta
              >
          >;
    onSnapshot?:
        | string
        | SingleOrArray<
              TransitionConfig<
                  TContext,
                  SnapshotEvent,
                  TEvent,
                  TActor,
                  TAction,
                  TGuard,
                  TDelay,
                  TEmitted,
                  TMeta
              >
          >;
    toJSON: () => Omit<
        InvokeDefinition<
            TContext,
            TEvent,
            TActor,
            TAction,
            TGuard,
            TDelay,
            TEmitted,
            TMeta
        >,
        'onDone' | 'onError' | 'toJSON'
    >;
}
type Delay<TDelay extends string> = TDelay | number;
type DelayedTransitions<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
> = {
    [K in Delay<TDelay>]?:
        | string
        | SingleOrArray<
              TransitionConfig<
                  TContext,
                  TEvent,
                  TEvent,
                  TActor,
                  TAction,
                  TGuard,
                  TDelay,
                  TODO, // TEmitted
                  TODO
              >
          >;
};
type StateTypes =
    | 'atomic'
    | 'compound'
    | 'parallel'
    | 'final'
    | 'history'
    | ({} & string);
type SingleOrArray<T> = readonly T[] | T;
type StateNodesConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
> = {
    [K in string]: StateNode<TContext, TEvent>;
};
type StatesConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TTag extends string,
    TOutput,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> = {
    [K in string]: StateNodeConfig<
        TContext,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TTag,
        TOutput,
        TEmitted,
        TMeta
    >;
};
type StatesDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
> = {
    [K in string]: StateNodeDefinition<TContext, TEvent>;
};
type TransitionConfigTarget = string | undefined;
type TransitionConfigOrTarget<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> = SingleOrArray<
    | TransitionConfigTarget
    | TransitionConfig<
          TContext,
          TExpressionEvent,
          TEvent,
          TActor,
          TAction,
          TGuard,
          TDelay,
          TEmitted,
          TMeta
      >
>;
type TransitionsConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> = {
    [K in EventDescriptor<TEvent>]?: TransitionConfigOrTarget<
        TContext,
        ExtractEvent<TEvent, K>,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted,
        TMeta
    >;
};
type PartialEventDescriptor<TEventType extends string> =
    TEventType extends `${infer TLeading}.${infer TTail}`
        ? `${TLeading}.*` | `${TLeading}.${PartialEventDescriptor<TTail>}`
        : never;
type EventDescriptor<TEvent extends EventObject> =
    | TEvent['type']
    | PartialEventDescriptor<TEvent['type']>
    | '*';
type NormalizeDescriptor<TDescriptor extends string> = TDescriptor extends '*'
    ? string
    : TDescriptor extends `${infer TLeading}.*`
      ? `${TLeading}.${string}`
      : TDescriptor;
type IsLiteralString<T extends string> = string extends T ? false : true;
type DistributeActors$1<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
    TSpecificActor extends ProvidedActor,
> = TSpecificActor extends {
    src: infer TSrc;
}
    ?
          | Compute<
                {
                    systemId?: string;
                    /** The source of the machine to be invoked, or the machine itself. */
                    src: TSrc;
                    /**
                     * The unique identifier for the invoked machine. If not specified,
                     * this will be the machine's own `id`, or the URL (from `src`).
                     */
                    id?: TSpecificActor['id'];
                    input?:
                        | Mapper<
                              TContext,
                              TEvent,
                              InputFrom<TSpecificActor['logic']>,
                              TEvent
                          >
                        | InputFrom<TSpecificActor['logic']>;
                    /**
                     * The transition to take upon the invoked child machine reaching
                     * its final top-level state.
                     */
                    onDone?:
                        | string
                        | SingleOrArray<
                              TransitionConfigOrTarget<
                                  TContext,
                                  DoneActorEvent<
                                      OutputFrom<TSpecificActor['logic']>
                                  >,
                                  TEvent,
                                  TActor,
                                  TAction,
                                  TGuard,
                                  TDelay,
                                  TEmitted,
                                  TMeta
                              >
                          >;
                    /**
                     * The transition to take upon the invoked child machine sending an
                     * error event.
                     */
                    onError?:
                        | string
                        | SingleOrArray<
                              TransitionConfigOrTarget<
                                  TContext,
                                  ErrorActorEvent,
                                  TEvent,
                                  TActor,
                                  TAction,
                                  TGuard,
                                  TDelay,
                                  TEmitted,
                                  TMeta
                              >
                          >;
                    onSnapshot?:
                        | string
                        | SingleOrArray<
                              TransitionConfigOrTarget<
                                  TContext,
                                  SnapshotEvent<
                                      SnapshotFrom<TSpecificActor['logic']>
                                  >,
                                  TEvent,
                                  TActor,
                                  TAction,
                                  TGuard,
                                  TDelay,
                                  TEmitted,
                                  TMeta
                              >
                          >;
                } & {
                    [K in RequiredActorOptions<TSpecificActor>]: unknown;
                }
            >
          | {
                id?: never;
                systemId?: string;
                src: AnyActorLogic;
                input?:
                    | Mapper<TContext, TEvent, NonReducibleUnknown, TEvent>
                    | NonReducibleUnknown;
                onDone?:
                    | string
                    | SingleOrArray<
                          TransitionConfigOrTarget<
                              TContext,
                              DoneActorEvent<unknown>,
                              TEvent,
                              TActor,
                              TAction,
                              TGuard,
                              TDelay,
                              TEmitted,
                              TMeta
                          >
                      >;
                onError?:
                    | string
                    | SingleOrArray<
                          TransitionConfigOrTarget<
                              TContext,
                              ErrorActorEvent,
                              TEvent,
                              TActor,
                              TAction,
                              TGuard,
                              TDelay,
                              TEmitted,
                              TMeta
                          >
                      >;
                onSnapshot?:
                    | string
                    | SingleOrArray<
                          TransitionConfigOrTarget<
                              TContext,
                              SnapshotEvent,
                              TEvent,
                              TActor,
                              TAction,
                              TGuard,
                              TDelay,
                              TEmitted,
                              TMeta
                          >
                      >;
            }
    : never;
type InvokeConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> =
    IsLiteralString<TActor['src']> extends true
        ? DistributeActors$1<
              TContext,
              TEvent,
              TActor,
              TAction,
              TGuard,
              TDelay,
              TEmitted,
              TMeta,
              TActor
          >
        : {
              /**
               * The unique identifier for the invoked machine. If not specified, this
               * will be the machine's own `id`, or the URL (from `src`).
               */
              id?: string;
              systemId?: string;
              /** The source of the machine to be invoked, or the machine itself. */
              src: AnyActorLogic | string;
              input?:
                  | Mapper<TContext, TEvent, NonReducibleUnknown, TEvent>
                  | NonReducibleUnknown;
              /**
               * The transition to take upon the invoked child machine reaching its
               * final top-level state.
               */
              onDone?:
                  | string
                  | SingleOrArray<
                        TransitionConfigOrTarget<
                            TContext,
                            DoneActorEvent<any>, // TODO: consider replacing with `unknown`
                            TEvent,
                            TActor,
                            TAction,
                            TGuard,
                            TDelay,
                            TEmitted,
                            TMeta
                        >
                    >;
              /**
               * The transition to take upon the invoked child machine sending an
               * error event.
               */
              onError?:
                  | string
                  | SingleOrArray<
                        TransitionConfigOrTarget<
                            TContext,
                            ErrorActorEvent,
                            TEvent,
                            TActor,
                            TAction,
                            TGuard,
                            TDelay,
                            TEmitted,
                            TMeta
                        >
                    >;
              onSnapshot?:
                  | string
                  | SingleOrArray<
                        TransitionConfigOrTarget<
                            TContext,
                            SnapshotEvent,
                            TEvent,
                            TActor,
                            TAction,
                            TGuard,
                            TDelay,
                            TEmitted,
                            TMeta
                        >
                    >;
          };
type AnyInvokeConfig = InvokeConfig<any, any, any, any, any, any, any, any>;
interface StateNodeConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TTag extends string,
    _TOutput,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> {
    /** The initial state transition. */
    initial?:
        | InitialTransitionConfig<
              TContext,
              TEvent,
              TActor,
              TAction,
              TGuard,
              TDelay
          >
        | string
        | undefined;
    /**
     * The type of this state node:
     *
     * - `'atomic'` - no child state nodes
     * - `'compound'` - nested child state nodes (XOR)
     * - `'parallel'` - orthogonal nested child state nodes (AND)
     * - `'history'` - history state node
     * - `'final'` - final state node
     */
    type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
    /**
     * Indicates whether the state node is a history state node, and what type of
     * history: shallow, deep, true (shallow), false (none), undefined (none)
     */
    history?: 'shallow' | 'deep' | boolean | undefined;
    /**
     * The mapping of state node keys to their state node configurations
     * (recursive).
     */
    states?:
        | StatesConfig<
              TContext,
              TEvent,
              TActor,
              TAction,
              TGuard,
              TDelay,
              TTag,
              NonReducibleUnknown,
              TEmitted,
              TMeta
          >
        | undefined;
    /**
     * The services to invoke upon entering this state node. These services will
     * be stopped upon exiting this state node.
     */
    invoke?: SingleOrArray<
        InvokeConfig<
            TContext,
            TEvent,
            TActor,
            TAction,
            TGuard,
            TDelay,
            TEmitted,
            TMeta
        >
    >;
    /** The mapping of event types to their potential transition(s). */
    on?: TransitionsConfig<
        TContext,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted,
        TMeta
    >;
    /** The action(s) to be executed upon entering the state node. */
    entry?: Actions<
        TContext,
        TEvent,
        TEvent,
        undefined,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >;
    /** The action(s) to be executed upon exiting the state node. */
    exit?: Actions<
        TContext,
        TEvent,
        TEvent,
        undefined,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >;
    /**
     * The potential transition(s) to be taken upon reaching a final child state
     * node.
     *
     * This is equivalent to defining a `[done(id)]` transition on this state
     * node's `on` property.
     */
    onDone?:
        | string
        | SingleOrArray<
              TransitionConfig<
                  TContext,
                  DoneStateEvent,
                  TEvent,
                  TActor,
                  TAction,
                  TGuard,
                  TDelay,
                  TEmitted,
                  TMeta
              >
          >
        | undefined;
    /**
     * The mapping (or array) of delays (in milliseconds) to their potential
     * transition(s). The delayed transitions are taken after the specified delay
     * in an interpreter.
     */
    after?: DelayedTransitions<
        TContext,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay
    >;
    /**
     * An eventless transition that is always taken when this state node is
     * active.
     */
    always?: TransitionConfigOrTarget<
        TContext,
        TEvent,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted,
        TMeta
    >;
    parent?: StateNode<TContext, TEvent>;
    /**
     * The meta data associated with this state node, which will be returned in
     * State instances.
     */
    meta?: TMeta;
    /**
     * The output data sent with the "xstate.done.state._id_" event if this is a
     * final state node.
     *
     * The output data will be evaluated with the current `context` and placed on
     * the `.data` property of the event.
     */
    output?: Mapper<TContext, TEvent, unknown, TEvent> | NonReducibleUnknown;
    /**
     * The unique ID of the state node, which can be referenced as a transition
     * target via the `#id` syntax.
     */
    id?: string | undefined;
    /**
     * The order this state node appears. Corresponds to the implicit document
     * order.
     */
    order?: number;
    /**
     * The tags for this state node, which are accumulated into the `state.tags`
     * property.
     */
    tags?: SingleOrArray<TTag>;
    /** A text description of the state node */
    description?: string;
    /** A default target for a history state */
    target?: string | undefined;
}
type AnyStateNodeConfig = StateNodeConfig<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any, // emitted
    any
>;
interface StateNodeDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
> {
    id: string;
    version?: string | undefined;
    key: string;
    type: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
    initial: InitialTransitionDefinition<TContext, TEvent> | undefined;
    history: boolean | 'shallow' | 'deep' | undefined;
    states: StatesDefinition<TContext, TEvent>;
    on: TransitionDefinitionMap<TContext, TEvent>;
    transitions: Array<TransitionDefinition<TContext, TEvent>>;
    entry: UnknownAction[];
    exit: UnknownAction[];
    meta: any;
    order: number;
    output?: StateNodeConfig<
        TContext,
        TEvent,
        ProvidedActor,
        ParameterizedObject,
        ParameterizedObject,
        string,
        string,
        unknown,
        EventObject, // TEmitted
        any
    >['output'];
    invoke: Array<
        InvokeDefinition<
            TContext,
            TEvent,
            TODO,
            TODO,
            TODO,
            TODO,
            TODO, // TEmitted
            TODO
        >
    >;
    description?: string;
    tags: string[];
}
interface StateMachineDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
> extends StateNodeDefinition<TContext, TEvent> {}
type AnyStateNode = StateNode<any, any>;
type AnyStateNodeDefinition = StateNodeDefinition<any, any>;
type AnyMachineSnapshot = MachineSnapshot<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
>;
/** @deprecated Use `AnyMachineSnapshot` instead */
type AnyState = AnyMachineSnapshot;
type AnyStateMachine = StateMachine<
    any, // context
    any, // event
    any, // children
    any, // actor
    any, // action
    any, // guard
    any, // delay
    any, // state value
    any, // tag
    any, // input
    any, // output
    any, // emitted
    any, // TMeta
    any
>;
type AnyStateConfig = StateConfig<any, AnyEventObject>;
interface AtomicStateNodeConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
> extends StateNodeConfig<
    TContext,
    TEvent,
    TODO,
    TODO,
    TODO,
    TODO,
    TODO,
    TODO,
    TODO, // emitted
    TODO
> {
    initial?: undefined;
    parallel?: false | undefined;
    states?: undefined;
    onDone?: undefined;
}
interface HistoryStateNodeConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
> extends AtomicStateNodeConfig<TContext, TEvent> {
    history: 'shallow' | 'deep' | true;
    target: string | undefined;
}
type SimpleOrStateNodeConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
> =
    | AtomicStateNodeConfig<TContext, TEvent>
    | StateNodeConfig<
          TContext,
          TEvent,
          TODO,
          TODO,
          TODO,
          TODO,
          TODO,
          TODO,
          TODO, // emitted
          TODO
      >;
type ActionFunctionMap<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject = ParameterizedObject,
    TGuard extends ParameterizedObject = ParameterizedObject,
    TDelay extends string = string,
    TEmitted extends EventObject = EventObject,
> = {
    [K in TAction['type']]?: ActionFunction<
        TContext,
        TEvent,
        TEvent,
        GetParameterizedParams<
            TAction extends {
                type: K;
            }
                ? TAction
                : never
        >,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >;
};
type GuardMap<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TGuard extends ParameterizedObject,
> = {
    [K in TGuard['type']]?: GuardPredicate<
        TContext,
        TEvent,
        GetParameterizedParams<
            TGuard extends {
                type: K;
            }
                ? TGuard
                : never
        >,
        TGuard
    >;
};
type DelayFunctionMap<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TAction extends ParameterizedObject,
> = Record<string, DelayConfig<TContext, TEvent, TAction['params'], TEvent>>;
type DelayConfig<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> = number | DelayExpr<TContext, TExpressionEvent, TParams, TEvent>;
/** @ignore */
interface MachineImplementationsSimplified<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor = ProvidedActor,
    TAction extends ParameterizedObject = ParameterizedObject,
    TGuard extends ParameterizedObject = ParameterizedObject,
> {
    guards: GuardMap<TContext, TEvent, TGuard>;
    actions: ActionFunctionMap<TContext, TEvent, TActor, TAction>;
    actors: Record<
        string,
        | AnyActorLogic
        | {
              src: AnyActorLogic;
              input:
                  | Mapper<TContext, TEvent, unknown, TEvent>
                  | NonReducibleUnknown;
          }
    >;
    delays: DelayFunctionMap<TContext, TEvent, TAction>;
}
type MachineImplementationsActions<TTypes extends StateMachineTypes> = {
    [K in TTypes['actions']['type']]?: ActionFunction<
        TTypes['context'],
        TTypes['events'],
        TTypes['events'],
        GetConcreteByKey<TTypes['actions'], 'type', K>['params'],
        TTypes['actors'],
        TTypes['actions'],
        TTypes['guards'],
        TTypes['delays'],
        TTypes['emitted']
    >;
};
type MachineImplementationsActors<TTypes extends StateMachineTypes> = {
    [K in TTypes['actors']['src']]?: GetConcreteByKey<
        TTypes['actors'],
        'src',
        K
    >['logic'];
};
type MachineImplementationsDelays<TTypes extends StateMachineTypes> = {
    [K in TTypes['delays']]?: DelayConfig<
        TTypes['context'],
        TTypes['events'],
        undefined,
        TTypes['events']
    >;
};
type MachineImplementationsGuards<TTypes extends StateMachineTypes> = {
    [K in TTypes['guards']['type']]?: Guard<
        TTypes['context'],
        TTypes['events'],
        GetConcreteByKey<TTypes['guards'], 'type', K>['params'],
        TTypes['guards']
    >;
};
type InternalMachineImplementations<TTypes extends StateMachineTypes> = {
    actions?: MachineImplementationsActions<TTypes>;
    actors?: MachineImplementationsActors<TTypes>;
    delays?: MachineImplementationsDelays<TTypes>;
    guards?: MachineImplementationsGuards<TTypes>;
};
type InitialContext<
    TContext extends MachineContext,
    TActor extends ProvidedActor,
    TInput,
    TEvent extends EventObject,
> = TContext | ContextFactory<TContext, TActor, TInput, TEvent>;
type ContextFactory<
    TContext extends MachineContext,
    TActor extends ProvidedActor,
    TInput,
    TEvent extends EventObject = EventObject,
> = ({
    spawn,
    input,
    self,
}: {
    spawn: Spawner<TActor>;
    input: TInput;
    self: ActorRef<
        MachineSnapshot<
            TContext,
            TEvent,
            Record<string, AnyActorRef | undefined>, // TODO: this should be replaced with `TChildren`
            StateValue,
            string,
            unknown,
            TODO, // TMeta
            TODO
        >,
        TEvent,
        AnyEventObject
    >;
}) => TContext;
type MachineConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor = ProvidedActor,
    TAction extends ParameterizedObject = ParameterizedObject,
    TGuard extends ParameterizedObject = ParameterizedObject,
    TDelay extends string = string,
    TTag extends string = string,
    TInput = any,
    TOutput = unknown,
    TEmitted extends EventObject = EventObject,
    TMeta extends MetaObject = MetaObject,
> = (Omit<
    StateNodeConfig<
        DoNotInfer<TContext>,
        DoNotInfer<TEvent>,
        DoNotInfer<TActor>,
        DoNotInfer<TAction>,
        DoNotInfer<TGuard>,
        DoNotInfer<TDelay>,
        DoNotInfer<TTag>,
        DoNotInfer<TOutput>,
        DoNotInfer<TEmitted>,
        DoNotInfer<TMeta>
    >,
    'output'
> & {
    /** The initial context (extended state) */
    /** The machine's own version. */
    version?: string;
    output?: Mapper<TContext, DoneStateEvent, TOutput, TEvent> | TOutput;
}) &
    (MachineContext extends TContext
        ? {
              context?: InitialContext<
                  LowInfer<TContext>,
                  TActor,
                  TInput,
                  TEvent
              >;
          }
        : {
              context: InitialContext<
                  LowInfer<TContext>,
                  TActor,
                  TInput,
                  TEvent
              >;
          });
type UnknownMachineConfig = MachineConfig<MachineContext, EventObject>;
interface ProvidedActor {
    src: string;
    logic: UnknownActorLogic;
    id?: string | undefined;
}
interface SetupTypes<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TChildrenMap extends Record<string, string>,
    TTag extends string,
    TInput,
    TOutput,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> {
    context?: TContext;
    events?: TEvent;
    children?: TChildrenMap;
    tags?: TTag;
    input?: TInput;
    output?: TOutput;
    emitted?: TEmitted;
    meta?: TMeta;
}
interface MachineTypes<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TTag extends string,
    TInput,
    TOutput,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> extends SetupTypes<
    TContext,
    TEvent,
    never,
    TTag,
    TInput,
    TOutput,
    TEmitted,
    TMeta
> {
    actors?: TActor;
    actions?: TAction;
    guards?: TGuard;
    delays?: TDelay;
    meta?: TMeta;
}
interface HistoryStateNode<
    TContext extends MachineContext,
> extends StateNode<TContext> {
    history: 'shallow' | 'deep';
    target: string | undefined;
}
type HistoryValue<
    TContext extends MachineContext,
    TEvent extends EventObject,
> = Record<string, Array<StateNode<TContext, TEvent>>>;
type PersistedHistoryValue = Record<
    string,
    Array<{
        id: string;
    }>
>;
type AnyHistoryValue = HistoryValue<any, any>;
type StateFrom<
    T extends AnyStateMachine | ((...args: any[]) => AnyStateMachine),
> = T extends AnyStateMachine
    ? ReturnType<T['transition']>
    : T extends (...args: any[]) => AnyStateMachine
      ? ReturnType<ReturnType<T>['transition']>
      : never;
type Transitions<
    TContext extends MachineContext,
    TEvent extends EventObject,
> = Array<TransitionDefinition<TContext, TEvent>>;
interface DoneActorEvent<
    TOutput = unknown,
    TId extends string = string,
> extends EventObject {
    type: `xstate.done.actor.${TId}`;
    output: TOutput;
    actorId: TId;
}
interface ErrorActorEvent<
    TErrorData = unknown,
    TId extends string = string,
> extends EventObject {
    type: `xstate.error.actor.${TId}`;
    error: TErrorData;
    actorId: TId;
}
interface SnapshotEvent<
    TSnapshot extends Snapshot<unknown> = Snapshot<unknown>,
> extends EventObject {
    type: `xstate.snapshot.${string}`;
    snapshot: TSnapshot;
}
interface DoneStateEvent<TOutput = unknown> extends EventObject {
    type: `xstate.done.state.${string}`;
    output: TOutput;
}
type DelayExpr<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> = (
    args: ActionArgs<TContext, TExpressionEvent, TEvent>,
    params: TParams
) => number;
type LogExpr<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> = (
    args: ActionArgs<TContext, TExpressionEvent, TEvent>,
    params: TParams
) => unknown;
type SendExpr<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TSentEvent extends EventObject,
    TEvent extends EventObject,
> = (
    args: ActionArgs<TContext, TExpressionEvent, TEvent>,
    params: TParams
) => TSentEvent;
declare enum SpecialTargets {
    Parent = '#_parent',
    Internal = '#_internal',
}
interface SendToActionOptions<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TDelay extends string,
> extends RaiseActionOptions<
    TContext,
    TExpressionEvent,
    TParams,
    TEvent,
    TDelay
> {}
interface RaiseActionOptions<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TDelay extends string,
> {
    id?: string;
    delay?:
        | Delay<TDelay>
        | DelayExpr<TContext, TExpressionEvent, TParams, TEvent>;
}
interface RaiseActionParams<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TDelay extends string,
> extends RaiseActionOptions<
    TContext,
    TExpressionEvent,
    TParams,
    TEvent,
    TDelay
> {
    event:
        | TEvent
        | SendExpr<TContext, TExpressionEvent, TParams, TEvent, TEvent>;
}
interface SendToActionParams<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TSentEvent extends EventObject,
    TEvent extends EventObject,
    TDelay extends string,
> extends SendToActionOptions<
    TContext,
    TExpressionEvent,
    TParams,
    TEvent,
    TDelay
> {
    event:
        | TSentEvent
        | SendExpr<TContext, TExpressionEvent, TParams, TSentEvent, TEvent>;
}
type Assigner<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> = (
    args: AssignArgs<TContext, TExpressionEvent, TEvent, TActor>,
    params: TParams
) => Partial<TContext>;
type PartialAssigner<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TKey extends keyof TContext,
> = (
    args: AssignArgs<TContext, TExpressionEvent, TEvent, TActor>,
    params: TParams
) => TContext[TKey];
type PropertyAssigner<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> = {
    [K in keyof TContext]?:
        | PartialAssigner<
              TContext,
              TExpressionEvent,
              TParams,
              TEvent,
              TActor,
              K
          >
        | TContext[K];
};
type Mapper<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TResult,
    TEvent extends EventObject,
> = (args: {
    context: TContext;
    event: TExpressionEvent;
    self: ActorRef<
        MachineSnapshot<
            TContext,
            TEvent,
            Record<string, AnyActorRef>, // TODO: this should be replaced with `TChildren`
            StateValue,
            string,
            unknown,
            TODO, // TMeta
            TODO
        >,
        TEvent,
        AnyEventObject
    >;
}) => TResult;
interface TransitionDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
> extends Omit<
    TransitionConfig<
        TContext,
        TEvent,
        TEvent,
        TODO,
        TODO,
        TODO,
        TODO,
        TODO, // TEmitted
        TODO
    >,
    'target' | 'guard'
> {
    target: ReadonlyArray<StateNode<TContext, TEvent>> | undefined;
    source: StateNode<TContext, TEvent>;
    actions: readonly UnknownAction[];
    reenter: boolean;
    guard?: UnknownGuard;
    eventType: EventDescriptor<TEvent>;
    toJSON: () => {
        target: string[] | undefined;
        source: string;
        actions: readonly UnknownAction[];
        guard?: UnknownGuard;
        eventType: EventDescriptor<TEvent>;
        meta?: Record<string, any>;
    };
}
type AnyTransitionDefinition = TransitionDefinition<any, any>;
interface InitialTransitionDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
> extends TransitionDefinition<TContext, TEvent> {
    target: ReadonlyArray<StateNode<TContext, TEvent>>;
    guard?: never;
}
type TransitionDefinitionMap<
    TContext extends MachineContext,
    TEvent extends EventObject,
> = {
    [K in EventDescriptor<TEvent>]: Array<
        TransitionDefinition<TContext, ExtractEvent<TEvent, K>>
    >;
};
interface DelayedTransitionDefinition<
    TContext extends MachineContext,
    TEvent extends EventObject,
> extends TransitionDefinition<TContext, TEvent> {
    delay: number | string | DelayExpr<TContext, TEvent, undefined, TEvent>;
}
interface StateLike<TContext extends MachineContext> {
    value: StateValue;
    context: TContext;
    event: EventObject;
}
interface StateConfig<
    TContext extends MachineContext,
    TEvent extends EventObject,
> {
    context: TContext;
    historyValue?: HistoryValue<TContext, TEvent>;
    children: Record<string, AnyActorRef>;
    status: SnapshotStatus;
    output?: any;
    error?: unknown;
    machine?: StateMachine<
        TContext,
        TEvent,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any, // TMeta
        any
    >;
}
interface ActorOptions<TLogic extends AnyActorLogic> {
    /**
     * The clock that is responsible for setting and clearing timeouts, such as
     * delayed events and transitions.
     *
     * @remarks
     * You can create your own “clock”. The clock interface is an object with two
     * functions/methods:
     *
     * - `setTimeout` - same arguments as `window.setTimeout(fn, timeout)`
     * - `clearTimeout` - same arguments as `window.clearTimeout(id)`
     *
     * By default, the native `setTimeout` and `clearTimeout` functions are used.
     *
     * For testing, XState provides `SimulatedClock`.
     * @see {@link Clock}
     * @see {@link SimulatedClock}
     */
    clock?: Clock;
    /**
     * Specifies the logger to be used for `log(...)` actions. Defaults to the
     * native `console.log(...)` method.
     */
    logger?: (...args: any[]) => void;
    parent?: AnyActorRef;
    /** The custom `id` for referencing this service. */
    id?: string;
    /** @deprecated Use `inspect` instead. */
    devTools?: never;
    /** The system ID to register this actor under. */
    systemId?: string;
    /** The input data to pass to the actor. */
    input?: InputFrom<TLogic>;
    /**
     * Initializes actor logic from a specific persisted internal state.
     *
     * @remarks
     * If the state is compatible with the actor logic, when the actor is started
     * it will be at that persisted state. Actions from machine actors will not be
     * re-executed, because they are assumed to have been already executed.
     * However, invocations will be restarted, and spawned actors will be restored
     * recursively.
     *
     * Can be generated with {@link Actor.getPersistedSnapshot}.
     * @see https://stately.ai/docs/persistence
     */
    snapshot?: Snapshot<unknown>;
    /** @deprecated Use `snapshot` instead. */
    state?: Snapshot<unknown>;
    /** The source actor logic. */
    src?: string | AnyActorLogic;
    /**
     * A callback function or observer object which can be used to inspect actor
     * system updates.
     *
     * @remarks
     * If a callback function is provided, it can accept an inspection event
     * argument. The types of inspection events that can be observed include:
     *
     * - `@xstate.actor` - An actor ref has been created in the system
     * - `@xstate.event` - An event was sent from a source actor ref to a target
     *   actor ref in the system
     * - `@xstate.snapshot` - An actor ref emitted a snapshot due to a received
     *   event
     *
     * @example
     *
     * ```ts
     * import { createMachine } from 'xstate';
     *
     * const machine = createMachine({
     *   // ...
     * });
     *
     * const actor = createActor(machine, {
     *   inspect: (inspectionEvent) => {
     *     if (inspectionEvent.actorRef === actor) {
     *       // This event is for the root actor
     *     }
     *
     *     if (inspectionEvent.type === '@xstate.actor') {
     *       console.log(inspectionEvent.actorRef);
     *     }
     *
     *     if (inspectionEvent.type === '@xstate.event') {
     *       console.log(inspectionEvent.sourceRef);
     *       console.log(inspectionEvent.actorRef);
     *       console.log(inspectionEvent.event);
     *     }
     *
     *     if (inspectionEvent.type === '@xstate.snapshot') {
     *       console.log(inspectionEvent.actorRef);
     *       console.log(inspectionEvent.event);
     *       console.log(inspectionEvent.snapshot);
     *     }
     *   }
     * });
     * ```
     *
     * Alternately, an observer object (`{ next?, error?, complete? }`) can be
     * provided:
     *
     * @example
     *
     * ```ts
     * const actor = createActor(machine, {
     *   inspect: {
     *     next: (inspectionEvent) => {
     *       if (inspectionEvent.actorRef === actor) {
     *         // This event is for the root actor
     *       }
     *
     *       if (inspectionEvent.type === '@xstate.actor') {
     *         console.log(inspectionEvent.actorRef);
     *       }
     *
     *       if (inspectionEvent.type === '@xstate.event') {
     *         console.log(inspectionEvent.sourceRef);
     *         console.log(inspectionEvent.actorRef);
     *         console.log(inspectionEvent.event);
     *       }
     *
     *       if (inspectionEvent.type === '@xstate.snapshot') {
     *         console.log(inspectionEvent.actorRef);
     *         console.log(inspectionEvent.event);
     *         console.log(inspectionEvent.snapshot);
     *       }
     *     }
     *   }
     * });
     * ```
     */
    inspect?:
        | Observer<InspectionEvent>
        | ((inspectionEvent: InspectionEvent) => void);
}
type AnyActor = Actor<any>;
/** @deprecated Use `AnyActor` instead. */
type AnyInterpreter = AnyActor;
type Observer<T> = {
    next?: (value: T) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
};
interface Subscription {
    unsubscribe(): void;
}
interface InteropObservable<T> {
    [Symbol.observable]: () => InteropSubscribable<T>;
}
interface InteropSubscribable<T> {
    subscribe(observer: Observer<T>): Subscription;
}
interface Subscribable<T> extends InteropSubscribable<T> {
    subscribe(observer: Observer<T>): Subscription;
    subscribe(
        next: (value: T) => void,
        error?: (error: any) => void,
        complete?: () => void
    ): Subscription;
}
type EventDescriptorMatches<
    TEventType extends string,
    TNormalizedDescriptor,
> = TEventType extends TNormalizedDescriptor ? true : false;
type ExtractEvent<
    TEvent extends EventObject,
    TDescriptor extends EventDescriptor<TEvent>,
> = string extends TEvent['type']
    ? TEvent
    : NormalizeDescriptor<TDescriptor> extends infer TNormalizedDescriptor
      ? TEvent extends any
          ? true extends EventDescriptorMatches<
                TEvent['type'],
                TNormalizedDescriptor
            >
              ? TEvent
              : never
          : never
      : never;
interface BaseActorRef<TEvent extends EventObject> {
    send: (event: TEvent) => void;
}
interface ActorLike<
    TCurrent,
    TEvent extends EventObject,
> extends Subscribable<TCurrent> {
    send: (event: TEvent) => void;
}
interface ActorRef<
    TSnapshot extends Snapshot<unknown>,
    TEvent extends EventObject,
    TEmitted extends EventObject = EventObject,
>
    extends Subscribable<TSnapshot>, InteropObservable<TSnapshot> {
    /** The unique identifier for this actor relative to its parent. */
    id: string;
    sessionId: string;
    send: (event: TEvent) => void;
    start: () => void;
    getSnapshot: () => TSnapshot;
    getPersistedSnapshot: () => Snapshot<unknown>;
    stop: () => void;
    toJSON?: () => any;
    _parent?: AnyActorRef;
    system: AnyActorSystem;
    src: string | AnyActorLogic;
    on: <TType extends TEmitted['type'] | '*'>(
        type: TType,
        handler: (
            emitted: TEmitted &
                (TType extends '*'
                    ? unknown
                    : {
                          type: TType;
                      })
        ) => void
    ) => Subscription;
}
type AnyActorRef = ActorRef<
    any,
    any, // TODO: shouldn't this be AnyEventObject?
    any
>;
type ActorRefLike = Pick<AnyActorRef, 'sessionId' | 'send' | 'getSnapshot'>;
type UnknownActorRef = ActorRef<Snapshot<unknown>, EventObject>;
type ActorLogicFrom<T> =
    ReturnTypeOrValue<T> extends infer R
        ? R extends StateMachine<
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any, // TMeta
              any
          >
            ? R
            : R extends Promise<infer U>
              ? PromiseActorLogic<U>
              : never
        : never;
type ActorRefFrom<T> =
    ReturnTypeOrValue<T> extends infer R
        ? R extends StateMachine<
              infer TContext,
              infer TEvent,
              infer TChildren,
              infer _TActor,
              infer _TAction,
              infer _TGuard,
              infer _TDelay,
              infer TStateValue,
              infer TTag,
              infer _TInput,
              infer TOutput,
              infer TEmitted,
              infer TMeta,
              infer TStateSchema
          >
            ? ActorRef<
                  MachineSnapshot<
                      TContext,
                      TEvent,
                      TChildren,
                      TStateValue,
                      TTag,
                      TOutput,
                      TMeta,
                      TStateSchema
                  >,
                  TEvent,
                  TEmitted
              >
            : R extends Promise<infer U>
              ? ActorRefFrom<PromiseActorLogic<U>>
              : R extends ActorLogic<
                      infer TSnapshot,
                      infer TEvent,
                      infer _TInput,
                      infer _TSystem,
                      infer TEmitted
                  >
                ? ActorRef<TSnapshot, TEvent, TEmitted>
                : never
        : never;
type ActorRefFromLogic<T extends AnyActorLogic> = ActorRef<
    SnapshotFrom<T>,
    EventFromLogic<T>,
    EmittedFrom<T>
>;
type DevToolsAdapter = (service: AnyActor) => void;
/** @deprecated Use `Actor<T>` instead. */
type InterpreterFrom<
    T extends AnyStateMachine | ((...args: any[]) => AnyStateMachine),
> =
    ReturnTypeOrValue<T> extends StateMachine<
        infer TContext,
        infer TEvent,
        infer TChildren,
        infer _TActor,
        infer _TAction,
        infer _TGuard,
        infer _TDelay,
        infer TStateValue,
        infer TTag,
        infer TInput,
        infer TOutput,
        infer TEmitted,
        infer TMeta,
        infer TStateSchema
    >
        ? Actor<
              ActorLogic<
                  MachineSnapshot<
                      TContext,
                      TEvent,
                      TChildren,
                      TStateValue,
                      TTag,
                      TOutput,
                      TMeta,
                      TStateSchema
                  >,
                  TEvent,
                  TInput,
                  AnyActorSystem,
                  TEmitted
              >
          >
        : never;
type MachineImplementationsFrom<
    T extends AnyStateMachine | ((...args: any[]) => AnyStateMachine),
> =
    ReturnTypeOrValue<T> extends StateMachine<
        infer TContext,
        infer TEvent,
        infer _TChildren,
        infer TActor,
        infer TAction,
        infer TGuard,
        infer TDelay,
        infer _TStateValue,
        infer TTag,
        infer _TInput,
        infer _TOutput,
        infer TEmitted,
        infer _TMeta,
        infer _TStateSchema
    >
        ? InternalMachineImplementations<
              ResolvedStateMachineTypes<
                  TContext,
                  TEvent,
                  TActor,
                  TAction,
                  TGuard,
                  TDelay,
                  TTag,
                  TEmitted
              >
          >
        : never;
interface ActorScope<
    TSnapshot extends Snapshot<unknown>,
    TEvent extends EventObject,
    TSystem extends AnyActorSystem = AnyActorSystem,
    TEmitted extends EventObject = EventObject,
> {
    self: ActorRef<TSnapshot, TEvent, TEmitted>;
    id: string;
    sessionId: string;
    logger: (...args: any[]) => void;
    defer: (fn: () => void) => void;
    emit: (event: TEmitted) => void;
    system: TSystem;
    stopChild: (child: AnyActorRef) => void;
    actionExecutor: ActionExecutor;
}
type AnyActorScope = ActorScope<
    any, // TSnapshot
    any, // TEvent
    AnyActorSystem,
    any
>;
type SnapshotStatus = 'active' | 'done' | 'error' | 'stopped';
type Snapshot<TOutput> =
    | {
          status: 'active';
          output: undefined;
          error: undefined;
      }
    | {
          status: 'done';
          output: TOutput;
          error: undefined;
      }
    | {
          status: 'error';
          output: undefined;
          error: unknown;
      }
    | {
          status: 'stopped';
          output: undefined;
          error: undefined;
      };
/**
 * Represents logic which can be used by an actor.
 *
 * @template TSnapshot - The type of the snapshot.
 * @template TEvent - The type of the event object.
 * @template TInput - The type of the input.
 * @template TSystem - The type of the actor system.
 */
interface ActorLogic<
    in out TSnapshot extends Snapshot<unknown>, // it's invariant because it's also part of `ActorScope["self"]["getSnapshot"]`
    in out TEvent extends EventObject, // it's invariant because it's also part of `ActorScope["self"]["send"]`
    in TInput = NonReducibleUnknown,
    TSystem extends AnyActorSystem = AnyActorSystem,
    in out TEmitted extends EventObject = EventObject,
> {
    /** The initial setup/configuration used to create the actor logic. */
    config?: unknown;
    /**
     * Transition function that processes the current state and an incoming event
     * to produce a new state.
     *
     * @param snapshot - The current state.
     * @param event - The incoming event.
     * @param actorScope - The actor scope.
     * @returns The new state.
     */
    transition: (
        snapshot: TSnapshot,
        event: TEvent,
        actorScope: ActorScope<TSnapshot, TEvent, TSystem, TEmitted>
    ) => TSnapshot;
    /**
     * Called to provide the initial state of the actor.
     *
     * @param actorScope - The actor scope.
     * @param input - The input for the initial state.
     * @returns The initial state.
     */
    getInitialSnapshot: (
        actorScope: ActorScope<TSnapshot, TEvent, TSystem, TEmitted>,
        input: TInput
    ) => TSnapshot;
    /**
     * Called when Actor is created to restore the internal state of the actor
     * given a persisted state. The persisted state can be created by
     * `getPersistedSnapshot`.
     *
     * @param persistedState - The persisted state to restore from.
     * @param actorScope - The actor scope.
     * @returns The restored state.
     */
    restoreSnapshot?: (
        persistedState: Snapshot<unknown>,
        actorScope: ActorScope<TSnapshot, TEvent, AnyActorSystem, TEmitted>
    ) => TSnapshot;
    /**
     * Called when the actor is started.
     *
     * @param snapshot - The starting state.
     * @param actorScope - The actor scope.
     */
    start?: (
        snapshot: TSnapshot,
        actorScope: ActorScope<TSnapshot, TEvent, AnyActorSystem, TEmitted>
    ) => void;
    /**
     * Obtains the internal state of the actor in a representation which can be be
     * persisted. The persisted state can be restored by `restoreSnapshot`.
     *
     * @param snapshot - The current state.
     * @returns The a representation of the internal state to be persisted.
     */
    getPersistedSnapshot: (
        snapshot: TSnapshot,
        options?: unknown
    ) => Snapshot<unknown>;
}
type AnyActorLogic = ActorLogic<
    any, // snapshot
    any, // event
    any, // input
    any, // system
    any
>;
type UnknownActorLogic = ActorLogic<
    any, // snapshot
    any, // event
    any, // input
    AnyActorSystem,
    any
>;
type SnapshotFrom<T> =
    ReturnTypeOrValue<T> extends infer R
        ? R extends ActorRef<infer TSnapshot, infer _, infer __>
            ? TSnapshot
            : R extends Actor<infer TLogic>
              ? SnapshotFrom<TLogic>
              : R extends ActorLogic<
                      infer _TSnapshot,
                      infer _TEvent,
                      infer _TInput,
                      infer _TEmitted,
                      infer _TSystem
                  >
                ? ReturnType<R['transition']>
                : R extends ActorScope<
                        infer TSnapshot,
                        infer _TEvent,
                        infer _TEmitted,
                        infer _TSystem
                    >
                  ? TSnapshot
                  : never
        : never;
type EventFromLogic<TLogic extends AnyActorLogic> =
    TLogic extends ActorLogic<
        infer _TSnapshot,
        infer TEvent,
        infer _TInput,
        infer _TEmitted,
        infer _TSystem
    >
        ? TEvent
        : never;
type EmittedFrom<TLogic extends AnyActorLogic> =
    TLogic extends ActorLogic<
        infer _TSnapshot,
        infer _TEvent,
        infer _TInput,
        infer _TSystem,
        infer TEmitted
    >
        ? TEmitted
        : never;
type ResolveEventType<T> =
    ReturnTypeOrValue<T> extends infer R
        ? R extends StateMachine<
              infer _TContext,
              infer TEvent,
              infer _TChildren,
              infer _TActor,
              infer _TAction,
              infer _TGuard,
              infer _TDelay,
              infer _TStateValue,
              infer _TTag,
              infer _TInput,
              infer _TOutput,
              infer _TEmitted,
              infer _TMeta,
              infer _TStateSchema
          >
            ? TEvent
            : R extends MachineSnapshot<
                    infer _TContext,
                    infer TEvent,
                    infer _TChildren,
                    infer _TStateValue,
                    infer _TTag,
                    infer _TOutput,
                    infer _TMeta,
                    infer _TStateSchema
                >
              ? TEvent
              : R extends ActorRef<
                      infer _TSnapshot,
                      infer TEvent,
                      infer _TEmitted
                  >
                ? TEvent
                : never
        : never;
type EventFrom<
    T,
    K extends Prop<TEvent, 'type'> = never,
    TEvent extends EventObject = ResolveEventType<T>,
> = IsNever<K> extends true ? TEvent : ExtractEvent<TEvent, K>;
type ContextFrom<T> =
    ReturnTypeOrValue<T> extends infer R
        ? R extends StateMachine<
              infer TContext,
              infer _TEvent,
              infer _TChildren,
              infer _TActor,
              infer _TAction,
              infer _TGuard,
              infer _TDelay,
              infer _TStateValue,
              infer _TTag,
              infer _TInput,
              infer _TOutput,
              infer _TEmitted,
              infer _TMeta,
              infer _TStateSchema
          >
            ? TContext
            : R extends MachineSnapshot<
                    infer TContext,
                    infer _TEvent,
                    infer _TChildren,
                    infer _TStateValue,
                    infer _TTag,
                    infer _TOutput,
                    infer _TMeta,
                    infer _TStateSchema
                >
              ? TContext
              : R extends Actor<infer TActorLogic>
                ? TActorLogic extends StateMachine<
                      infer TContext,
                      infer _TEvent,
                      infer _TChildren,
                      infer _TActor,
                      infer _TAction,
                      infer _TGuard,
                      infer _TDelay,
                      infer _TStateValue,
                      infer _TTag,
                      infer _TInput,
                      infer _TOutput,
                      infer _TEmitted,
                      infer _TMeta,
                      infer _TStateSchema
                  >
                    ? TContext
                    : never
                : never
        : never;
type InferEvent<E extends EventObject> = {
    [T in E['type']]: {
        type: T;
    } & Extract<
        E,
        {
            type: T;
        }
    >;
}[E['type']];
type TODO = any;
type StateValueFrom<TMachine extends AnyStateMachine> = Parameters<
    StateFrom<TMachine>['matches']
>[0];
type TagsFrom<TMachine extends AnyStateMachine> = Parameters<
    StateFrom<TMachine>['hasTag']
>[0];
interface ActorSystemInfo {
    actors: Record<string, AnyActorRef>;
}
type RequiredActorOptions<TActor extends ProvidedActor> =
    | (undefined extends TActor['id'] ? never : 'id')
    | (undefined extends InputFrom<TActor['logic']> ? never : 'input');
type RequiredLogicInput<TLogic extends AnyActorLogic> =
    undefined extends InputFrom<TLogic> ? never : 'input';
type ExtractLiteralString<T extends string | undefined> = T extends string
    ? string extends T
        ? never
        : T
    : never;
type ToConcreteChildren<TActor extends ProvidedActor> = {
    [A in TActor as ExtractLiteralString<A['id']>]?: ActorRefFromLogic<
        A['logic']
    >;
};
type ToChildren<TActor extends ProvidedActor> = string extends TActor['src']
    ? Record<string, AnyActorRef>
    : Compute<
          ToConcreteChildren<TActor> &
              {
                  include: {
                      [id: string]: TActor extends any
                          ? ActorRefFromLogic<TActor['logic']> | undefined
                          : never;
                  };
                  exclude: unknown;
              }[undefined extends TActor['id']
                  ? 'include'
                  : string extends TActor['id']
                    ? 'include'
                    : 'exclude']
      >;
type StateSchema = {
    id?: string;
    states?: Record<string, StateSchema>;
    type?: unknown;
    invoke?: unknown;
    on?: unknown;
    entry?: unknown;
    exit?: unknown;
    onDone?: unknown;
    after?: unknown;
    always?: unknown;
    meta?: unknown;
    output?: unknown;
    tags?: unknown;
    description?: unknown;
};
type StateId<
    TSchema extends StateSchema,
    TKey extends string = '(machine)',
    TParentKey extends string | null = null,
> =
    | (TSchema extends {
          id: string;
      }
          ? TSchema['id']
          : TParentKey extends null
            ? TKey
            : `${TParentKey}.${TKey}`)
    | (TSchema['states'] extends Record<string, any>
          ? Values<{
                [K in keyof TSchema['states'] & string]: StateId<
                    TSchema['states'][K],
                    K,
                    TParentKey extends string
                        ? `${TParentKey}.${TKey}`
                        : TSchema['id'] extends string
                          ? TSchema['id']
                          : TKey
                >;
            }>
          : never);
interface StateMachineTypes {
    context: MachineContext;
    events: EventObject;
    actors: ProvidedActor;
    actions: ParameterizedObject;
    guards: ParameterizedObject;
    delays: string;
    tags: string;
    emitted: EventObject;
}
/** @deprecated */
interface ResolvedStateMachineTypes<
    TContext extends MachineContext,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TTag extends string,
    TEmitted extends EventObject = EventObject,
> {
    context: TContext;
    events: TEvent;
    actors: TActor;
    actions: TAction;
    guards: TGuard;
    delays: TDelay;
    tags: TTag;
    emitted: TEmitted;
}
type GetConcreteByKey<T, TKey extends keyof T, TValue extends T[TKey]> = T &
    Record<TKey, TValue>;
type _GroupStateKeys<
    T extends StateSchema,
    S extends keyof T['states'],
> = S extends any
    ? T['states'][S] extends {
          type: 'history';
      }
        ? [never, never]
        : T extends {
                type: 'parallel';
            }
          ? [S, never]
          : 'states' extends keyof T['states'][S]
            ? [S, never]
            : [never, S]
    : never;
type GroupStateKeys<T extends StateSchema, S extends keyof T['states']> = {
    nonLeaf: _GroupStateKeys<T, S & string>[0];
    leaf: _GroupStateKeys<T, S & string>[1];
};
type ToStateValue<T extends StateSchema> = T extends {
    states: Record<infer S, any>;
}
    ? IsNever<S> extends true
        ? {}
        :
              | GroupStateKeys<T, S>['leaf']
              | (IsNever<GroupStateKeys<T, S>['nonLeaf']> extends false
                    ? T extends {
                          type: 'parallel';
                      }
                        ? {
                              [K in GroupStateKeys<
                                  T,
                                  S
                              >['nonLeaf']]: ToStateValue<T['states'][K]>;
                          }
                        : Compute<
                              Values<{
                                  [K in GroupStateKeys<T, S>['nonLeaf']]: {
                                      [StateKey in K]: ToStateValue<
                                          T['states'][K]
                                      >;
                                  };
                              }>
                          >
                    : never)
    : {};
interface ExecutableActionObject {
    type: string;
    info: ActionArgs<MachineContext, EventObject, EventObject>;
    params: NonReducibleUnknown;
    exec:
        | ((info: ActionArgs<any, any, any>, params: unknown) => void)
        | undefined;
}
interface ToExecutableAction<
    T extends ParameterizedObject,
> extends ExecutableActionObject {
    type: T['type'];
    params: T['params'];
    exec: undefined;
}
interface ExecutableSpawnAction extends ExecutableActionObject {
    type: 'xstate.spawnChild';
    info: ActionArgs<MachineContext, EventObject, EventObject>;
    params: {
        id: string;
        actorRef: AnyActorRef | undefined;
        src: string | AnyActorLogic;
    };
}
type SpecialExecutableAction =
    | ExecutableSpawnAction
    | ExecutableRaiseAction
    | ExecutableSendToAction;
type ExecutableActionsFrom<T extends AnyActorLogic> =
    T extends StateMachine<
        infer _TContext,
        infer _TEvent,
        infer _TChildren,
        infer _TActor,
        infer TAction,
        infer _TGuard,
        infer _TDelay,
        infer _TStateValue,
        infer _TTag,
        infer _TInput,
        infer _TOutput,
        infer _TEmitted,
        infer _TMeta,
        infer _TStateSchema
    >
        ?
              | SpecialExecutableAction
              | (string extends TAction['type']
                    ? never
                    : ToExecutableAction<TAction>)
        : never;
type ActionExecutor = (actionToExecute: ExecutableActionObject) => void;
type BuiltinActionResolution = [
    AnyMachineSnapshot,
    NonReducibleUnknown,
    (
        // params
        UnknownAction[] | undefined
    ),
];

type SpawnOptions<
    TActor extends ProvidedActor,
    TSrc extends TActor['src'],
> = TActor extends {
    src: TSrc;
}
    ? ConditionalRequired<
          [
              options?: {
                  id?: TActor['id'];
                  systemId?: string;
                  input?: InputFrom<TActor['logic']>;
                  syncSnapshot?: boolean;
              } & {
                  [K in RequiredActorOptions<TActor>]: unknown;
              },
          ],
          IsNotNever<RequiredActorOptions<TActor>>
      >
    : never;
type Spawner<TActor extends ProvidedActor> =
    IsLiteralString<TActor['src']> extends true
        ? {
              <TSrc extends TActor['src']>(
                  logic: TSrc,
                  ...[options]: SpawnOptions<TActor, TSrc>
              ): ActorRefFromLogic<
                  GetConcreteByKey<TActor, 'src', TSrc>['logic']
              >;
              <TLogic extends AnyActorLogic>(
                  src: TLogic,
                  ...[options]: ConditionalRequired<
                      [
                          options?: {
                              id?: never;
                              systemId?: string;
                              input?: InputFrom<TLogic>;
                              syncSnapshot?: boolean;
                          } & {
                              [K in RequiredLogicInput<TLogic>]: unknown;
                          },
                      ],
                      IsNotNever<RequiredLogicInput<TLogic>>
                  >
              ): ActorRefFromLogic<TLogic>;
          }
        : <TLogic extends AnyActorLogic | string>(
              src: TLogic,
              ...[options]: ConditionalRequired<
                  [
                      options?: {
                          id?: string;
                          systemId?: string;
                          input?: TLogic extends string
                              ? unknown
                              : InputFrom<TLogic>;
                          syncSnapshot?: boolean;
                      } & (TLogic extends AnyActorLogic
                          ? {
                                [K in RequiredLogicInput<TLogic>]: unknown;
                            }
                          : {}),
                  ],
                  IsNotNever<
                      TLogic extends AnyActorLogic
                          ? RequiredLogicInput<TLogic>
                          : never
                  >
              >
          ) => TLogic extends AnyActorLogic
              ? ActorRefFromLogic<TLogic>
              : AnyActorRef;

interface AssignArgs<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> extends ActionArgs<TContext, TExpressionEvent, TEvent> {
    spawn: Spawner<TActor>;
}
interface AssignAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TActor?: TActor;
}
/**
 * Updates the current context of the machine.
 *
 * @example
 *
 * ```ts
 * import { createMachine, assign } from 'xstate';
 *
 * const countMachine = createMachine({
 *   context: {
 *     count: 0,
 *     message: ''
 *   },
 *   on: {
 *     inc: {
 *       actions: assign({
 *         count: ({ context }) => context.count + 1
 *       })
 *     },
 *     updateMessage: {
 *       actions: assign(({ context, event }) => {
 *         return {
 *           message: event.message.trim()
 *         };
 *       })
 *     }
 *   }
 * });
 * ```
 *
 * @param assignment An object that represents the partial context to update, or
 *   a function that returns an object that represents the partial context to
 *   update.
 */
declare function assign<
    TContext extends MachineContext,
    TExpressionEvent extends AnyEventObject, // TODO: consider using a stricter `EventObject` here
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
>(
    assignment:
        | Assigner<
              LowInfer<TContext>,
              TExpressionEvent,
              TParams,
              TEvent,
              TActor
          >
        | PropertyAssigner<
              LowInfer<TContext>,
              TExpressionEvent,
              TParams,
              TEvent,
              TActor
          >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    TActor,
    never,
    never,
    never,
    never
>;

type ResolvableSendId<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> =
    | string
    | ((
          args: ActionArgs<TContext, TExpressionEvent, TEvent>,
          params: TParams
      ) => string);
interface CancelAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
}
/**
 * Cancels a delayed `sendTo(...)` action that is waiting to be executed. The
 * canceled `sendTo(...)` action will not send its event or execute, unless the
 * `delay` has already elapsed before `cancel(...)` is called.
 *
 * @example
 *
 * ```ts
 * import { createMachine, sendTo, cancel } from 'xstate';
 *
 * const machine = createMachine({
 *   // ...
 *   on: {
 *     sendEvent: {
 *       actions: sendTo(
 *         'some-actor',
 *         { type: 'someEvent' },
 *         {
 *           id: 'some-id',
 *           delay: 1000
 *         }
 *       )
 *     },
 *     cancelEvent: {
 *       actions: cancel('some-id')
 *     }
 *   }
 * });
 * ```
 *
 * @param sendId The `id` of the `sendTo(...)` action to cancel.
 */
declare function cancel<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
>(
    sendId: ResolvableSendId<TContext, TExpressionEvent, TParams, TEvent>
): CancelAction<TContext, TExpressionEvent, TParams, TEvent>;

interface EmitAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TEmitted extends EventObject,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TEmitted?: TEmitted;
}
/**
 * Emits an event to event handlers registered on the actor via `actor.on(event,
 * handler)`.
 *
 * @example
 *
 * ```ts
 * import { emit } from 'xstate';
 *
 * const machine = createMachine({
 *   // ...
 *   on: {
 *     something: {
 *       actions: emit({
 *         type: 'emitted',
 *         some: 'data'
 *       })
 *     }
 *   }
 *   // ...
 * });
 *
 * const actor = createActor(machine).start();
 *
 * actor.on('emitted', (event) => {
 *   console.log(event);
 * });
 *
 * actor.send({ type: 'something' });
 * // logs:
 * // {
 * //   type: 'emitted',
 * //   some: 'data'
 * // }
 * ```
 */
declare function emit<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TEmitted extends AnyEventObject,
>(
    /** The event to emit, or an expression that returns an event to emit. */
    eventOrExpr:
        | DoNotInfer<TEmitted>
        | SendExpr<
              TContext,
              TExpressionEvent,
              TParams,
              DoNotInfer<TEmitted>,
              TEvent
          >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    never,
    never,
    never,
    never,
    TEmitted
>;

type ResolvableActorId<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TId extends string | undefined,
> = TId | ((args: UnifiedArg<TContext, TExpressionEvent, TEvent>) => TId);
interface SpawnAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TActor?: TActor;
}
interface SpawnActionOptions<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> {
    id?: ResolvableActorId<TContext, TExpressionEvent, TEvent, TActor['id']>;
    systemId?: string;
    input?:
        | Mapper<TContext, TEvent, InputFrom<TActor['logic']>, TEvent>
        | InputFrom<TActor['logic']>;
    syncSnapshot?: boolean;
}
type DistributeActors<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> =
    | (TActor extends any
          ? ConditionalRequired<
                [
                    src: TActor['src'],
                    options?: SpawnActionOptions<
                        TContext,
                        TExpressionEvent,
                        TEvent,
                        TActor
                    > & {
                        [K in RequiredActorOptions<TActor>]: unknown;
                    },
                ],
                IsNotNever<RequiredActorOptions<TActor>>
            >
          : never)
    | [
          src: AnyActorLogic,
          options?: SpawnActionOptions<
              TContext,
              TExpressionEvent,
              TEvent,
              ProvidedActor
          > & {
              id?: never;
          },
      ];
type SpawnArguments<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
> =
    IsLiteralString<TActor['src']> extends true
        ? DistributeActors<TContext, TExpressionEvent, TEvent, TActor>
        : [
              src: string | AnyActorLogic,
              options?: {
                  id?: ResolvableActorId<
                      TContext,
                      TExpressionEvent,
                      TEvent,
                      string
                  >;
                  systemId?: string;
                  input?: unknown;
                  syncSnapshot?: boolean;
              },
          ];
declare function spawnChild<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
>(
    ...[src, { id, systemId, input, syncSnapshot }]: SpawnArguments<
        TContext,
        TExpressionEvent,
        TEvent,
        TActor
    >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    TActor,
    never,
    never,
    never,
    never
>;

type ResolvableActorRef<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> =
    | string
    | AnyActorRef
    | ((
          args: ActionArgs<TContext, TExpressionEvent, TEvent>,
          params: TParams
      ) => AnyActorRef | string);
interface StopAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
}
/**
 * Stops a child actor.
 *
 * @param actorRef The actor to stop.
 */
declare function stopChild<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
>(
    actorRef: ResolvableActorRef<TContext, TExpressionEvent, TParams, TEvent>
): StopAction<TContext, TExpressionEvent, TParams, TEvent>;
/**
 * Stops a child actor.
 *
 * @deprecated Use `stopChild(...)` instead
 * @alias
 */
declare const stop: typeof stopChild;

interface ActionEnqueuer<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
> {
    (
        action: Action<
            TContext,
            TExpressionEvent,
            TEvent,
            undefined,
            TActor,
            TAction,
            TGuard,
            TDelay,
            TEmitted
        >
    ): void;
    assign: (
        ...args: Parameters<
            typeof assign<TContext, TExpressionEvent, undefined, TEvent, TActor>
        >
    ) => void;
    cancel: (
        ...args: Parameters<
            typeof cancel<TContext, TExpressionEvent, undefined, TEvent>
        >
    ) => void;
    raise: (
        ...args: Parameters<
            typeof raise<
                TContext,
                TExpressionEvent,
                TEvent,
                undefined,
                TDelay,
                TDelay
            >
        >
    ) => void;
    sendTo: <TTargetActor extends AnyActorRef>(
        ...args: Parameters<
            typeof sendTo<
                TContext,
                TExpressionEvent,
                undefined,
                TTargetActor,
                TEvent,
                TDelay,
                TDelay
            >
        >
    ) => void;
    sendParent: (
        ...args: Parameters<
            typeof sendParent<
                TContext,
                TExpressionEvent,
                undefined,
                AnyEventObject,
                TEvent,
                TDelay,
                TDelay
            >
        >
    ) => void;
    spawnChild: (
        ...args: Parameters<
            typeof spawnChild<
                TContext,
                TExpressionEvent,
                undefined,
                TEvent,
                TActor
            >
        >
    ) => void;
    stopChild: (
        ...args: Parameters<
            typeof stopChild<TContext, TExpressionEvent, undefined, TEvent>
        >
    ) => void;
    emit: (
        ...args: Parameters<
            typeof emit<TContext, TExpressionEvent, undefined, TEvent, TEmitted>
        >
    ) => void;
}
interface EnqueueActionsAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
    _out_TEvent?: TEvent;
    _out_TActor?: TActor;
    _out_TAction?: TAction;
    _out_TGuard?: TGuard;
    _out_TDelay?: TDelay;
}
interface CollectActionsArg<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
> extends UnifiedArg<TContext, TExpressionEvent, TEvent> {
    check: (
        guard: Guard<TContext, TExpressionEvent, undefined, TGuard>
    ) => boolean;
    enqueue: ActionEnqueuer<
        TContext,
        TExpressionEvent,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >;
}
type CollectActions<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TEmitted extends EventObject,
> = (
    {
        context,
        event,
        check,
        enqueue,
        self,
    }: CollectActionsArg<
        TContext,
        TExpressionEvent,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >,
    params: TParams
) => void;
/**
 * Creates an action object that will execute actions that are queued by the
 * `enqueue(action)` function.
 *
 * @example
 *
 * ```ts
 * import { createMachine, enqueueActions } from 'xstate';
 *
 * const machine = createMachine({
 *   entry: enqueueActions(({ enqueue, check }) => {
 *     enqueue.assign({ count: 0 });
 *
 *     if (check('someGuard')) {
 *       enqueue.assign({ count: 1 });
 *     }
 *
 *     enqueue('someAction');
 *   })
 * });
 * ```
 */
declare function enqueueActions<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject = TExpressionEvent,
    TActor extends ProvidedActor = ProvidedActor,
    TAction extends ParameterizedObject = ParameterizedObject,
    TGuard extends ParameterizedObject = ParameterizedObject,
    TDelay extends string = never,
    TEmitted extends EventObject = EventObject,
>(
    collect: CollectActions<
        TContext,
        TExpressionEvent,
        TParams,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TEmitted
    >
): ActionFunction<
    TContext,
    TExpressionEvent,
    TEvent,
    TParams,
    TActor,
    TAction,
    TGuard,
    TDelay,
    TEmitted
>;

type ResolvableLogValue<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> = string | LogExpr<TContext, TExpressionEvent, TParams, TEvent>;
interface LogAction<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
> {
    (
        args: ActionArgs<TContext, TExpressionEvent, TEvent>,
        params: TParams
    ): void;
}
/**
 * @param expr The expression function to evaluate which will be logged. Takes
 *   in 2 arguments:
 *
 *   - `ctx` - the current state context
 *   - `event` - the event that caused this action to be executed.
 *
 * @param label The label to give to the logged expression.
 */
declare function log<
    TContext extends MachineContext,
    TExpressionEvent extends EventObject,
    TParams extends ParameterizedObject['params'] | undefined,
    TEvent extends EventObject,
>(
    value?: ResolvableLogValue<TContext, TExpressionEvent, TParams, TEvent>,
    label?: string
): LogAction<TContext, TExpressionEvent, TParams, TEvent>;

type CallbackSnapshot<TInput> = Snapshot<undefined> & {
    input: TInput;
};
type CallbackActorLogic<
    TEvent extends EventObject,
    TInput = NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
> = ActorLogic<
    CallbackSnapshot<TInput>,
    TEvent,
    TInput,
    AnyActorSystem,
    TEmitted
>;
/**
 * Represents an actor created by `fromCallback`.
 *
 * The type of `self` within the actor's logic.
 *
 * @example
 *
 * ```ts
 * import { fromCallback, createActor } from 'xstate';
 *
 * // The events the actor receives.
 * type Event = { type: 'someEvent' };
 * // The actor's input.
 * type Input = { name: string };
 *
 * // Actor logic that logs whenever it receives an event of type `someEvent`.
 * const logic = fromCallback<Event, Input>(({ self, input, receive }) => {
 *   self;
 *   // ^? CallbackActorRef<Event, Input>
 *
 *   receive((event) => {
 *     if (event.type === 'someEvent') {
 *       console.log(`${input.name}: received "someEvent" event`);
 *       // logs 'myActor: received "someEvent" event'
 *     }
 *   });
 * });
 *
 * const actor = createActor(logic, { input: { name: 'myActor' } });
 * //    ^? CallbackActorRef<Event, Input>
 * ```
 *
 * @see {@link fromCallback}
 */
type CallbackActorRef<
    TEvent extends EventObject,
    TInput = NonReducibleUnknown,
> = ActorRefFromLogic<CallbackActorLogic<TEvent, TInput>>;
type Receiver<TEvent extends EventObject> = (
    listener: {
        bivarianceHack(event: TEvent): void;
    }['bivarianceHack']
) => void;
type CallbackLogicFunction<
    TEvent extends EventObject = AnyEventObject,
    TSentEvent extends EventObject = AnyEventObject,
    TInput = NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
> = ({
    input,
    system,
    self,
    sendBack,
    receive,
    emit,
}: {
    /**
     * Data that was provided to the callback actor
     *
     * @see {@link https://stately.ai/docs/input | Input docs}
     */
    input: TInput;
    /** The actor system to which the callback actor belongs */
    system: AnyActorSystem;
    /** The parent actor of the callback actor */
    self: CallbackActorRef<TEvent>;
    /** A function that can send events back to the parent actor */
    sendBack: (event: TSentEvent) => void;
    /**
     * A function that can be called with a listener function argument; the
     * listener is then called whenever events are received by the callback actor
     */
    receive: Receiver<TEvent>;
    emit: (emitted: TEmitted) => void;
}) => (() => void) | void;
/**
 * An actor logic creator which returns callback logic as defined by a callback
 * function.
 *
 * @remarks
 * Useful for subscription-based or other free-form logic that can send events
 * back to the parent actor.
 *
 * Actors created from callback logic (“callback actors”) can:
 *
 * - Receive events via the `receive` function
 * - Send events to the parent actor via the `sendBack` function
 *
 * Callback actors are a bit different from other actors in that they:
 *
 * - Do not work with `onDone`
 * - Do not produce a snapshot using `.getSnapshot()`
 * - Do not emit values when used with `.subscribe()`
 * - Can not be stopped with `.stop()`
 *
 * @example
 *
 * ```typescript
 * const callbackLogic = fromCallback(({ sendBack, receive }) => {
 *   let lockStatus = 'unlocked';
 *
 *   const handler = (event) => {
 *     if (lockStatus === 'locked') {
 *       return;
 *     }
 *     sendBack(event);
 *   };
 *
 *   receive((event) => {
 *     if (event.type === 'lock') {
 *       lockStatus = 'locked';
 *     } else if (event.type === 'unlock') {
 *       lockStatus = 'unlocked';
 *     }
 *   });
 *
 *   document.body.addEventListener('click', handler);
 *
 *   return () => {
 *     document.body.removeEventListener('click', handler);
 *   };
 * });
 * ```
 *
 * @param callback - The callback function used to describe the callback logic
 *   The callback function is passed an object with the following properties:
 *
 *   - `receive` - A function that can send events back to the parent actor; the
 *       listener is then called whenever events are received by the callback
 *       actor
 *   - `sendBack` - A function that can send events back to the parent actor
 *   - `input` - Data that was provided to the callback actor
 *   - `self` - The parent actor of the callback actor
 *   - `system` - The actor system to which the callback actor belongs The callback
 *       function can (optionally) return a cleanup function, which is called
 *       when the actor is stopped.
 *
 * @returns Callback logic
 * @see {@link CallbackLogicFunction} for more information about the callback function and its object argument
 * @see {@link https://stately.ai/docs/input | Input docs} for more information about how input is passed
 */
declare function fromCallback<
    TEvent extends EventObject,
    TInput = NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
>(
    callback: CallbackLogicFunction<TEvent, AnyEventObject, TInput, TEmitted>
): CallbackActorLogic<TEvent, TInput, TEmitted>;

type ObservableSnapshot<
    TContext,
    TInput extends NonReducibleUnknown,
> = Snapshot<undefined> & {
    context: TContext | undefined;
    input: TInput | undefined;
    _subscription: Subscription | undefined;
};
type ObservableActorLogic<
    TContext,
    TInput extends NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
> = ActorLogic<
    ObservableSnapshot<TContext, TInput>,
    {
        type: string;
        [k: string]: unknown;
    },
    TInput,
    AnyActorSystem,
    TEmitted
>;
/**
 * Represents an actor created by `fromObservable` or `fromEventObservable`.
 *
 * The type of `self` within the actor's logic.
 *
 * @example
 *
 * ```ts
 * import { fromObservable, createActor } from 'xstate';
 * import { interval } from 'rxjs';
 *
 * // The type of the value observed by the actor's logic.
 * type Context = number;
 * // The actor's input.
 * type Input = { period?: number };
 *
 * // Actor logic that observes a number incremented every `input.period`
 * // milliseconds (default: 1_000).
 * const logic = fromObservable<Context, Input>(({ input, self }) => {
 *   self;
 *   // ^? ObservableActorRef<Event, Input>
 *
 *   return interval(input.period ?? 1_000);
 * });
 *
 * const actor = createActor(logic, { input: { period: 2_000 } });
 * //    ^? ObservableActorRef<Event, Input>
 * ```
 *
 * @see {@link fromObservable}
 * @see {@link fromEventObservable}
 */
type ObservableActorRef<TContext> = ActorRefFromLogic<
    ObservableActorLogic<TContext, any>
>;
/**
 * Observable actor logic is described by an observable stream of values. Actors
 * created from observable logic (“observable actors”) can:
 *
 * - Emit snapshots of the observable’s emitted value
 *
 * The observable’s emitted value is used as its observable actor’s `context`.
 *
 * Sending events to observable actors will have no effect.
 *
 * @example
 *
 * ```ts
 * import { fromObservable, createActor } from 'xstate';
 * import { interval } from 'rxjs';
 *
 * const logic = fromObservable((obj) => interval(1000));
 *
 * const actor = createActor(logic);
 *
 * actor.subscribe((snapshot) => {
 *   console.log(snapshot.context);
 * });
 *
 * actor.start();
 * // At every second:
 * // Logs 0
 * // Logs 1
 * // Logs 2
 * // ...
 * ```
 *
 * @param observableCreator A function that creates an observable. It receives
 *   one argument, an object with the following properties:
 *
 *   - `input` - Data that was provided to the observable actor
 *   - `self` - The parent actor
 *   - `system` - The actor system to which the observable actor belongs
 *
 *   It should return a {@link Subscribable}, which is compatible with an RxJS
 *   Observable, although RxJS is not required to create them.
 * @see {@link https://rxjs.dev} for documentation on RxJS Observable and observable creators.
 * @see {@link Subscribable} interface in XState, which is based on and compatible with RxJS Observable.
 */
declare function fromObservable<
    TContext,
    TInput extends NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
>(
    observableCreator: ({
        input,
        system,
        self,
    }: {
        input: TInput;
        system: AnyActorSystem;
        self: ObservableActorRef<TContext>;
        emit: (emitted: TEmitted) => void;
    }) => Subscribable<TContext>
): ObservableActorLogic<TContext, TInput, TEmitted>;
/**
 * Creates event observable logic that listens to an observable that delivers
 * event objects.
 *
 * Event observable actor logic is described by an observable stream of
 * {@link https://stately.ai/docs/transitions#event-objects | event objects}.
 * Actors created from event observable logic (“event observable actors”) can:
 *
 * - Implicitly send events to its parent actor
 * - Emit snapshots of its emitted event objects
 *
 * Sending events to event observable actors will have no effect.
 *
 * @example
 *
 * ```ts
 * import {
 *   fromEventObservable,
 *   Subscribable,
 *   EventObject,
 *   createMachine,
 *   createActor
 * } from 'xstate';
 * import { fromEvent } from 'rxjs';
 *
 * const mouseClickLogic = fromEventObservable(
 *   () => fromEvent(document.body, 'click') as Subscribable<EventObject>
 * );
 *
 * const canvasMachine = createMachine({
 *   invoke: {
 *     // Will send mouse `click` events to the canvas actor
 *     src: mouseClickLogic
 *   }
 * });
 *
 * const canvasActor = createActor(canvasMachine);
 * canvasActor.start();
 * ```
 *
 * @param lazyObservable A function that creates an observable that delivers
 *   event objects. It receives one argument, an object with the following
 *   properties:
 *
 *   - `input` - Data that was provided to the event observable actor
 *   - `self` - The parent actor
 *   - `system` - The actor system to which the event observable actor belongs.
 *
 *   It should return a {@link Subscribable}, which is compatible with an RxJS
 *   Observable, although RxJS is not required to create them.
 */
declare function fromEventObservable<
    TEvent extends EventObject,
    TInput extends NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
>(
    lazyObservable: ({
        input,
        system,
        self,
        emit,
    }: {
        input: TInput;
        system: AnyActorSystem;
        self: ObservableActorRef<TEvent>;
        emit: (emitted: TEmitted) => void;
    }) => Subscribable<TEvent>
): ObservableActorLogic<TEvent, TInput, TEmitted>;

type TransitionSnapshot<TContext> = Snapshot<undefined> & {
    context: TContext;
};
type TransitionActorLogic<
    TContext,
    TEvent extends EventObject,
    TInput extends NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
> = ActorLogic<
    TransitionSnapshot<TContext>,
    TEvent,
    TInput,
    AnyActorSystem,
    TEmitted
>;
/**
 * Represents an actor created by `fromTransition`.
 *
 * The type of `self` within the actor's logic.
 *
 * @example
 *
 * ```ts
 * import {
 *   fromTransition,
 *   createActor,
 *   type AnyActorSystem
 * } from 'xstate';
 *
 * //* The actor's stored context.
 * type Context = {
 *   // The current count.
 *   count: number;
 *   // The amount to increase `count` by.
 *   step: number;
 * };
 * // The events the actor receives.
 * type Event = { type: 'increment' };
 * // The actor's input.
 * type Input = { step?: number };
 *
 * // Actor logic that increments `count` by `step` when it receives an event of
 * // type `increment`.
 * const logic = fromTransition<Context, Event, AnyActorSystem, Input>(
 *   (state, event, actorScope) => {
 *     actorScope.self;
 *     //         ^? TransitionActorRef<Context, Event>
 *
 *     if (event.type === 'increment') {
 *       return {
 *         ...state,
 *         count: state.count + state.step
 *       };
 *     }
 *     return state;
 *   },
 *   ({ input, self }) => {
 *     self;
 *     // ^? TransitionActorRef<Context, Event>
 *
 *     return {
 *       count: 0,
 *       step: input.step ?? 1
 *     };
 *   }
 * );
 *
 * const actor = createActor(logic, { input: { step: 10 } });
 * //    ^? TransitionActorRef<Context, Event>
 * ```
 *
 * @see {@link fromTransition}
 */
type TransitionActorRef<
    TContext,
    TEvent extends EventObject,
> = ActorRefFromLogic<
    TransitionActorLogic<TransitionSnapshot<TContext>, TEvent, unknown>
>;
/**
 * Returns actor logic given a transition function and its initial state.
 *
 * A “transition function” is a function that takes the current `state` and
 * received `event` object as arguments, and returns the next state, similar to
 * a reducer.
 *
 * Actors created from transition logic (“transition actors”) can:
 *
 * - Receive events
 * - Emit snapshots of its state
 *
 * The transition function’s `state` is used as its transition actor’s
 * `context`.
 *
 * Note that the "state" for a transition function is provided by the initial
 * state argument, and is not the same as the State object of an actor or a
 * state within a machine configuration.
 *
 * @example
 *
 * ```ts
 * const transitionLogic = fromTransition(
 *   (state, event) => {
 *     if (event.type === 'increment') {
 *       return {
 *         ...state,
 *         count: state.count + 1
 *       };
 *     }
 *     return state;
 *   },
 *   { count: 0 }
 * );
 *
 * const transitionActor = createActor(transitionLogic);
 * transitionActor.subscribe((snapshot) => {
 *   console.log(snapshot);
 * });
 * transitionActor.start();
 * // => {
 * //   status: 'active',
 * //   context: { count: 0 },
 * //   ...
 * // }
 *
 * transitionActor.send({ type: 'increment' });
 * // => {
 * //   status: 'active',
 * //   context: { count: 1 },
 * //   ...
 * // }
 * ```
 *
 * @param transition The transition function used to describe the transition
 *   logic. It should return the next state given the current state and event.
 *   It receives the following arguments:
 *
 *   - `state` - the current state.
 *   - `event` - the received event.
 *   - `actorScope` - the actor scope object, with properties like `self` and
 *       `system`.
 *
 * @param initialContext The initial state of the transition function, either an
 *   object representing the state, or a function which returns a state object.
 *   If a function, it will receive as its only argument an object with the
 *   following properties:
 *
 *   - `input` - the `input` provided to its parent transition actor.
 *   - `self` - a reference to its parent transition actor.
 *
 * @returns Actor logic
 * @see {@link https://stately.ai/docs/input | Input docs} for more information about how input is passed
 */
declare function fromTransition<
    TContext,
    TEvent extends EventObject,
    TSystem extends AnyActorSystem,
    TInput extends NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
>(
    transition: (
        snapshot: TContext,
        event: TEvent,
        actorScope: ActorScope<
            TransitionSnapshot<TContext>,
            TEvent,
            TSystem,
            TEmitted
        >
    ) => TContext,
    initialContext:
        | TContext
        | (({
              input,
              self,
          }: {
              input: TInput;
              self: TransitionActorRef<TContext, TEvent>;
          }) => TContext)
): TransitionActorLogic<TContext, TEvent, TInput, TEmitted>;

declare function createEmptyActor(): ActorRef<
    Snapshot<undefined>,
    AnyEventObject,
    AnyEventObject
>;

/**
 * Asserts that the given event object is of the specified type or types. Throws
 * an error if the event object is not of the specified types.
 *
 * @example
 *
 * ```ts
 * // ...
 * entry: ({ event }) => {
 *   assertEvent(event, 'doNothing');
 *   // event is { type: 'doNothing' }
 * },
 * // ...
 * exit: ({ event }) => {
 *   assertEvent(event, 'greet');
 *   // event is { type: 'greet'; message: string }
 *
 *   assertEvent(event, ['greet', 'notify']);
 *   // event is { type: 'greet'; message: string }
 *   // or { type: 'notify'; message: string; level: 'info' | 'error' }
 * },
 * ```
 */
declare function assertEvent<
    TEvent extends EventObject,
    TAssertedDescriptor extends EventDescriptor<TEvent>,
>(
    event: TEvent,
    type: TAssertedDescriptor | readonly TAssertedDescriptor[]
): asserts event is ExtractEvent<TEvent, TAssertedDescriptor>;

/**
 * Creates a state machine (statechart) with the given configuration.
 *
 * The state machine represents the pure logic of a state machine actor.
 *
 * @example
 *
 * ```ts
 * import { createMachine } from 'xstate';
 *
 * const lightMachine = createMachine({
 *   id: 'light',
 *   initial: 'green',
 *   states: {
 *     green: {
 *       on: {
 *         TIMER: { target: 'yellow' }
 *       }
 *     },
 *     yellow: {
 *       on: {
 *         TIMER: { target: 'red' }
 *       }
 *     },
 *     red: {
 *       on: {
 *         TIMER: { target: 'green' }
 *       }
 *     }
 *   }
 * });
 *
 * const lightActor = createActor(lightMachine);
 * lightActor.start();
 *
 * lightActor.send({ type: 'TIMER' });
 * ```
 *
 * @param config The state machine configuration.
 * @param options DEPRECATED: use `setup({ ... })` or `machine.provide({ ... })`
 *   to provide machine implementations instead.
 */
declare function createMachine<
    TContext extends MachineContext,
    TEvent extends AnyEventObject, // TODO: consider using a stricter `EventObject` here
    TActor extends ProvidedActor,
    TAction extends ParameterizedObject,
    TGuard extends ParameterizedObject,
    TDelay extends string,
    TTag extends string,
    TInput,
    TOutput extends NonReducibleUnknown,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
    _ = any,
>(
    config: {
        types?: MachineTypes<
            TContext,
            TEvent,
            TActor,
            TAction,
            TGuard,
            TDelay,
            TTag,
            TInput,
            TOutput,
            TEmitted,
            TMeta
        >;
        schemas?: unknown;
    } & MachineConfig<
        TContext,
        TEvent,
        TActor,
        TAction,
        TGuard,
        TDelay,
        TTag,
        TInput,
        TOutput,
        TEmitted,
        TMeta
    >,
    implementations?: InternalMachineImplementations<
        ResolvedStateMachineTypes<
            TContext,
            TEvent,
            TActor,
            TAction,
            TGuard,
            TDelay,
            TTag,
            TEmitted
        >
    >
): StateMachine<
    TContext,
    TEvent,
    Cast<ToChildren<TActor>, Record<string, AnyActorRef | undefined>>,
    TActor,
    TAction,
    TGuard,
    TDelay,
    StateValue,
    TTag & string,
    TInput,
    TOutput,
    TEmitted,
    TMeta, // TMeta
    TODO
>;

/** @deprecated Use `initialTransition(…)` instead. */
declare function getInitialSnapshot<T extends AnyActorLogic>(
    actorLogic: T,
    ...[input]: undefined extends InputFrom<T>
        ? [input?: InputFrom<T>]
        : [input: InputFrom<T>]
): SnapshotFrom<T>;
/**
 * Determines the next snapshot for the given `actorLogic` based on the given
 * `snapshot` and `event`.
 *
 * If the `snapshot` is `undefined`, the initial snapshot of the `actorLogic` is
 * used.
 *
 * @deprecated Use `transition(…)` instead.
 * @example
 *
 * ```ts
 * import { getNextSnapshot } from 'xstate';
 * import { trafficLightMachine } from './trafficLightMachine.ts';
 *
 * const nextSnapshot = getNextSnapshot(
 *   trafficLightMachine, // actor logic
 *   undefined, // snapshot (or initial state if undefined)
 *   { type: 'TIMER' }
 * ); // event object
 *
 * console.log(nextSnapshot.value);
 * // => 'yellow'
 *
 * const nextSnapshot2 = getNextSnapshot(
 *   trafficLightMachine, // actor logic
 *   nextSnapshot, // snapshot
 *   { type: 'TIMER' }
 * ); // event object
 *
 * console.log(nextSnapshot2.value);
 * // =>'red'
 * ```
 */
declare function getNextSnapshot<T extends AnyActorLogic>(
    actorLogic: T,
    snapshot: SnapshotFrom<T>,
    event: EventFromLogic<T>
): SnapshotFrom<T>;

type ToParameterizedObject<
    TParameterizedMap extends Record<
        string,
        ParameterizedObject['params'] | undefined
    >,
> = Values<{
    [K in keyof TParameterizedMap as K & string]: {
        type: K & string;
        params: TParameterizedMap[K];
    };
}>;
type ToProvidedActor<
    TChildrenMap extends Record<string, string>,
    TActors extends Record<string, UnknownActorLogic>,
> = Values<{
    [K in keyof TActors as K & string]: {
        src: K & string;
        logic: TActors[K];
        id: IsNever<TChildrenMap> extends true
            ? string | undefined
            : K extends keyof Invert<TChildrenMap>
              ? Invert<TChildrenMap>[K] & string
              : string | undefined;
    };
}>;
type ToStateSchema<TSchema extends StateSchema> = {
    -readonly [K in keyof TSchema as K & ('id' | 'states')]: K extends 'states'
        ? {
              [SK in keyof TSchema['states']]: ToStateSchema<
                  NonNullable<TSchema['states'][SK]>
              >;
          }
        : TSchema[K];
};
type RequiredSetupKeys<TChildrenMap> =
    IsNever<keyof TChildrenMap> extends true ? never : 'actors';
type SetupReturn<
    TContext extends MachineContext,
    TEvent extends AnyEventObject,
    TActors extends Record<string, UnknownActorLogic>,
    TChildrenMap extends Record<string, string>,
    TActions extends Record<string, ParameterizedObject['params'] | undefined>,
    TGuards extends Record<string, ParameterizedObject['params'] | undefined>,
    TDelay extends string,
    TTag extends string,
    TInput,
    TOutput extends NonReducibleUnknown,
    TEmitted extends EventObject,
    TMeta extends MetaObject,
> = {
    extend: <
        TExtendActions extends Record<
            string,
            ParameterizedObject['params'] | undefined
        > = {},
        TExtendGuards extends Record<
            string,
            ParameterizedObject['params'] | undefined
        > = {},
        TExtendDelays extends string = never,
    >({
        actions,
        guards,
        delays,
    }: {
        actions?: {
            [K in keyof TExtendActions]: ActionFunction<
                TContext,
                TEvent,
                TEvent,
                TExtendActions[K],
                ToProvidedActor<TChildrenMap, TActors>,
                ToParameterizedObject<TActions & TExtendActions>,
                ToParameterizedObject<TGuards & TExtendGuards>,
                TDelay | TExtendDelays,
                TEmitted
            >;
        };
        guards?: {
            [K in keyof TExtendGuards]: GuardPredicate<
                TContext,
                TEvent,
                TExtendGuards[K],
                ToParameterizedObject<TGuards & TExtendGuards>
            >;
        };
        delays?: {
            [K in TExtendDelays]: DelayConfig<
                TContext,
                TEvent,
                ToParameterizedObject<TActions & TExtendActions>['params'],
                TEvent
            >;
        };
    }) => SetupReturn<
        TContext,
        TEvent,
        TActors,
        TChildrenMap,
        TActions & TExtendActions,
        TGuards & TExtendGuards,
        TDelay | TExtendDelays,
        TTag,
        TInput,
        TOutput,
        TEmitted,
        TMeta
    >;
    /**
     * Creates a state config that is strongly typed. This state config can be
     * used to create a machine.
     *
     * @example
     *
     * ```ts
     * const lightMachineSetup = setup({
     *   // ...
     * });
     *
     * const green = lightMachineSetup.createStateConfig({
     *   on: {
     *     timer: {
     *       actions: 'doSomething'
     *     }
     *   }
     * });
     *
     * const machine = lightMachineSetup.createMachine({
     *   initial: 'green',
     *   states: {
     *     green,
     *     yellow,
     *     red
     *   }
     * });
     * ```
     */
    createStateConfig: <
        TStateConfig extends StateNodeConfig<
            TContext,
            TEvent,
            ToProvidedActor<TChildrenMap, TActors>,
            ToParameterizedObject<TActions>,
            ToParameterizedObject<TGuards>,
            TDelay,
            TTag,
            unknown,
            TEmitted,
            TMeta
        >,
    >(
        config: TStateConfig
    ) => TStateConfig;
    /**
     * Creates a type-safe action.
     *
     * @example
     *
     * ```ts
     * const machineSetup = setup({
     *   // ...
     * });
     *
     * const action = machineSetup.createAction(({ context, event }) => {
     *   console.log(context.count, event.value);
     * });
     *
     * const incrementAction = machineSetup.createAction(
     *   assign({ count: ({ context }) => context.count + 1 })
     * );
     *
     * const machine = machineSetup.createMachine({
     *   context: { count: 0 },
     *   entry: [action, incrementAction]
     * });
     * ```
     */
    createAction: (
        action: ActionFunction<
            TContext,
            TEvent,
            TEvent,
            unknown,
            ToProvidedActor<TChildrenMap, TActors>,
            ToParameterizedObject<TActions>,
            ToParameterizedObject<TGuards>,
            TDelay,
            TEmitted
        >
    ) => typeof action;
    createMachine: <
        const TConfig extends MachineConfig<
            TContext,
            TEvent,
            ToProvidedActor<TChildrenMap, TActors>,
            ToParameterizedObject<TActions>,
            ToParameterizedObject<TGuards>,
            TDelay,
            TTag,
            TInput,
            TOutput,
            TEmitted,
            TMeta
        >,
    >(
        config: TConfig
    ) => StateMachine<
        TContext,
        TEvent,
        Cast<
            ToChildren<ToProvidedActor<TChildrenMap, TActors>>,
            Record<string, AnyActorRef | undefined>
        >,
        ToProvidedActor<TChildrenMap, TActors>,
        ToParameterizedObject<TActions>,
        ToParameterizedObject<TGuards>,
        TDelay,
        ToStateValue<TConfig>,
        TTag,
        TInput,
        TOutput,
        TEmitted,
        TMeta,
        ToStateSchema<TConfig>
    >;
    assign: typeof assign<
        TContext,
        TEvent,
        undefined,
        TEvent,
        ToProvidedActor<TChildrenMap, TActors>
    >;
    sendTo: <TTargetActor extends AnyActorRef>(
        ...args: Parameters<
            typeof sendTo<
                TContext,
                TEvent,
                undefined,
                TTargetActor,
                TEvent,
                TDelay,
                TDelay
            >
        >
    ) => ReturnType<
        typeof sendTo<
            TContext,
            TEvent,
            undefined,
            TTargetActor,
            TEvent,
            TDelay,
            TDelay
        >
    >;
    raise: typeof raise<TContext, TEvent, TEvent, undefined, TDelay, TDelay>;
    log: typeof log<TContext, TEvent, undefined, TEvent>;
    cancel: typeof cancel<TContext, TEvent, undefined, TEvent>;
    stopChild: typeof stopChild<TContext, TEvent, undefined, TEvent>;
    enqueueActions: typeof enqueueActions<
        TContext,
        TEvent,
        undefined,
        TEvent,
        ToProvidedActor<TChildrenMap, TActors>,
        ToParameterizedObject<TActions>,
        ToParameterizedObject<TGuards>,
        TDelay,
        TEmitted
    >;
    emit: typeof emit<TContext, TEvent, undefined, TEvent, TEmitted>;
    spawnChild: typeof spawnChild<
        TContext,
        TEvent,
        undefined,
        TEvent,
        ToProvidedActor<TChildrenMap, TActors>
    >;
};
declare function setup<
    TContext extends MachineContext,
    TEvent extends AnyEventObject, // TODO: consider using a stricter `EventObject` here
    TActors extends Record<string, UnknownActorLogic> = {},
    TChildrenMap extends Record<string, string> = {},
    TActions extends Record<string, ParameterizedObject['params'] | undefined> =
        {},
    TGuards extends Record<string, ParameterizedObject['params'] | undefined> =
        {},
    TDelay extends string = never,
    TTag extends string = string,
    TInput = NonReducibleUnknown,
    TOutput extends NonReducibleUnknown = NonReducibleUnknown,
    TEmitted extends EventObject = EventObject,
    TMeta extends MetaObject = MetaObject,
>({
    schemas,
    actors,
    actions,
    guards,
    delays,
}: {
    schemas?: unknown;
    types?: SetupTypes<
        TContext,
        TEvent,
        TChildrenMap,
        TTag,
        TInput,
        TOutput,
        TEmitted,
        TMeta
    >;
    actors?: {
        [K in keyof TActors | Values<TChildrenMap>]: K extends keyof TActors
            ? TActors[K]
            : never;
    };
    actions?: {
        [K in keyof TActions]: ActionFunction<
            TContext,
            TEvent,
            TEvent,
            TActions[K],
            ToProvidedActor<TChildrenMap, TActors>,
            ToParameterizedObject<TActions>,
            ToParameterizedObject<TGuards>,
            TDelay,
            TEmitted
        >;
    };
    guards?: {
        [K in keyof TGuards]: GuardPredicate<
            TContext,
            TEvent,
            TGuards[K],
            ToParameterizedObject<TGuards>
        >;
    };
    delays?: {
        [K in TDelay]: DelayConfig<
            TContext,
            TEvent,
            ToParameterizedObject<TActions>['params'],
            TEvent
        >;
    };
} & {
    [K in RequiredSetupKeys<TChildrenMap>]: unknown;
}): SetupReturn<
    TContext,
    TEvent,
    TActors,
    TChildrenMap,
    TActions,
    TGuards,
    TDelay,
    TTag,
    TInput,
    TOutput,
    TEmitted,
    TMeta
>;

interface SimulatedClock extends Clock {
    start(speed: number): void;
    increment(ms: number): void;
    set(ms: number): void;
}
declare class SimulatedClock implements SimulatedClock {
    private timeouts;
    private _now;
    private _id;
    private _flushing;
    private _flushingInvalidated;
    now(): number;
    private getId;
    setTimeout(fn: (...args: any[]) => void, timeout: number): number;
    clearTimeout(id: number): void;
    private flushTimeouts;
}

/**
 * Returns the state nodes represented by the current state value.
 *
 * @param stateValue The state value or State instance
 */
declare function getStateNodes(
    stateNode: AnyStateNode,
    stateValue: StateValue
): Array<AnyStateNode>;

/**
 * Returns a promise that resolves to the `output` of the actor when it is done.
 *
 * @example
 *
 * ```ts
 * const machine = createMachine({
 *   // ...
 *   output: {
 *     count: 42
 *   }
 * });
 *
 * const actor = createActor(machine);
 *
 * actor.start();
 *
 * const output = await toPromise(actor);
 *
 * console.log(output);
 * // logs { count: 42 }
 * ```
 */
declare function toPromise<T extends AnyActorRef>(
    actor: T
): Promise<OutputFrom<T>>;

declare function matchesState(
    parentStateId: StateValue,
    childStateId: StateValue
): boolean;
declare function pathToStateValue(statePath: string[]): StateValue;
declare function toObserver<T>(
    nextHandler?: Observer<T> | ((value: T) => void),
    errorHandler?: (error: any) => void,
    completionHandler?: () => void
): Observer<T>;
declare function getAllOwnEventDescriptors(snapshot: AnyMachineSnapshot): any[];

/**
 * Given actor `logic`, a `snapshot`, and an `event`, returns a tuple of the
 * `nextSnapshot` and `actions` to execute.
 *
 * This is a pure function that does not execute `actions`.
 */
declare function transition<T extends AnyActorLogic>(
    logic: T,
    snapshot: SnapshotFrom<T>,
    event: EventFromLogic<T>
): [nextSnapshot: SnapshotFrom<T>, actions: ExecutableActionsFrom<T>[]];
/**
 * Given actor `logic` and optional `input`, returns a tuple of the
 * `nextSnapshot` and `actions` to execute from the initial transition (no
 * previous state).
 *
 * This is a pure function that does not execute `actions`.
 */
declare function initialTransition<T extends AnyActorLogic>(
    logic: T,
    ...[input]: undefined extends InputFrom<T>
        ? [input?: InputFrom<T>]
        : [input: InputFrom<T>]
): [SnapshotFrom<T>, ExecutableActionsFrom<T>[]];

interface WaitForOptions {
    /**
     * How long to wait before rejecting, if no emitted state satisfies the
     * predicate.
     *
     * @defaultValue Infinity
     */
    timeout: number;
    /** A signal which stops waiting when aborted. */
    signal?: AbortSignal;
}
/**
 * Subscribes to an actor ref and waits for its emitted value to satisfy a
 * predicate, and then resolves with that value. Will throw if the desired state
 * is not reached after an optional timeout. (defaults to Infinity).
 *
 * @example
 *
 * ```js
 * const state = await waitFor(someService, (state) => {
 *   return state.hasTag('loaded');
 * });
 *
 * state.hasTag('loaded'); // true
 * ```
 *
 * @param actorRef The actor ref to subscribe to
 * @param predicate Determines if a value matches the condition to wait for
 * @param options
 * @returns A promise that eventually resolves to the emitted value that matches
 *   the condition
 */
declare function waitFor<TActorRef extends AnyActorRef>(
    actorRef: TActorRef,
    predicate: (emitted: SnapshotFrom<TActorRef>) => boolean,
    options?: Partial<WaitForOptions>
): Promise<SnapshotFrom<TActorRef>>;

declare global {
    interface SymbolConstructor {
        readonly observable: symbol;
    }
}

export {
    Actor,
    SimulatedClock,
    SpecialTargets,
    StateMachine,
    StateNode,
    getAllOwnEventDescriptors as __unsafe_getAllOwnEventDescriptors,
    and,
    assertEvent,
    assign,
    cancel,
    createActor,
    createEmptyActor,
    createMachine,
    emit,
    enqueueActions,
    forwardTo,
    fromCallback,
    fromEventObservable,
    fromObservable,
    fromPromise,
    fromTransition,
    getInitialSnapshot,
    getNextSnapshot,
    getStateNodes,
    initialTransition,
    interpret,
    isMachineSnapshot,
    log,
    matchesState,
    not,
    or,
    pathToStateValue,
    raise,
    sendParent,
    sendTo,
    setup,
    spawnChild,
    stateIn,
    stop,
    stopChild,
    toObserver,
    toPromise,
    transition,
    waitFor,
};
export type {
    Action,
    ActionArgs,
    ActionExecutor,
    ActionFunction,
    ActionFunctionMap,
    Actions,
    ActorLike,
    ActorLogic,
    ActorLogicFrom,
    ActorOptions,
    ActorRef,
    ActorRefFrom,
    ActorRefFromLogic,
    ActorRefLike,
    ActorScope,
    ActorSystem,
    ActorSystemInfo,
    AnyActor,
    AnyActorLogic,
    AnyActorRef,
    AnyActorScope,
    AnyEventObject,
    AnyFunction,
    AnyHistoryValue,
    AnyInterpreter,
    AnyInvokeConfig,
    AnyMachineSnapshot,
    AnyState,
    AnyStateConfig,
    AnyStateMachine,
    AnyStateNode,
    AnyStateNodeConfig,
    AnyStateNodeDefinition,
    AnyTransitionConfig,
    AnyTransitionDefinition,
    AssignAction,
    AssignArgs,
    Assigner,
    AtomicStateNodeConfig,
    BaseActorRef,
    BuiltinActionResolution,
    CallbackActorLogic,
    CallbackActorRef,
    CallbackLogicFunction,
    CallbackSnapshot,
    CancelAction,
    Cast,
    Compute,
    ConditionalRequired,
    ContextFactory,
    ContextFrom,
    DelayConfig,
    DelayExpr,
    DelayFunctionMap,
    DelayedTransitionDefinition,
    DelayedTransitions,
    DevToolsAdapter,
    DoNotInfer,
    DoneActorEvent,
    DoneStateEvent,
    Elements,
    EmitAction,
    EmittedFrom,
    EnqueueActionsAction,
    Equals,
    ErrorActorEvent,
    EventDescriptor,
    EventFrom,
    EventFromLogic,
    EventObject,
    ExecutableActionObject,
    ExecutableActionsFrom,
    ExecutableSpawnAction,
    ExtractEvent,
    GetConcreteByKey,
    GetParameterizedParams,
    HistoryStateNode,
    HistoryStateNodeConfig,
    HistoryValue,
    HomomorphicOmit,
    HomomorphicPick,
    Identity,
    IndexByProp,
    IndexByType,
    InferEvent,
    InitialTransitionConfig,
    InitialTransitionDefinition,
    InputFrom,
    InspectedActionEvent,
    InspectedActorEvent,
    InspectedEventEvent,
    InspectedMicrostepEvent,
    InspectedSnapshotEvent,
    InspectionEvent,
    InternalMachineImplementations,
    InteropObservable,
    InteropSubscribable,
    Interpreter,
    InterpreterFrom,
    Invert,
    InvokeConfig,
    InvokeDefinition,
    IsAny,
    IsLiteralString,
    IsNever,
    IsNotNever,
    Lazy,
    LogAction,
    LogExpr,
    LowInfer,
    MachineConfig,
    MachineContext,
    MachineImplementationsFrom,
    MachineImplementationsSimplified,
    MachineSnapshot,
    MachineTypes,
    Mapper,
    MaybeLazy,
    Merge,
    MetaObject,
    NoInfer,
    NoRequiredParams,
    NonReducibleUnknown,
    ObservableActorLogic,
    ObservableActorRef,
    ObservableSnapshot,
    Observer,
    OutputFrom,
    ParameterizedObject,
    PartialAssigner,
    PersistedHistoryValue,
    PromiseActorLogic,
    PromiseActorRef,
    PromiseSnapshot,
    Prop,
    PropertyAssigner,
    ProvidedActor,
    RaiseAction,
    RaiseActionOptions,
    RaiseActionParams,
    RequiredActorOptions,
    RequiredActorOptionsKeys,
    RequiredLogicInput,
    ResolvedStateMachineTypes,
    SendExpr,
    SendToAction,
    SendToActionOptions,
    SendToActionParams,
    SetupTypes,
    SimpleOrStateNodeConfig,
    SingleOrArray,
    Snapshot,
    SnapshotEvent,
    SnapshotFrom,
    SnapshotStatus,
    SpawnAction,
    Spawner,
    SpecialExecutableAction,
    StateConfig,
    StateFrom,
    StateId,
    StateKey,
    StateLike,
    StateMachineDefinition,
    StateMachineTypes,
    StateNodeConfig,
    StateNodeDefinition,
    StateNodesConfig,
    StateSchema,
    StateTypes,
    StateValue,
    StateValueFrom,
    StateValueMap,
    StatesConfig,
    StatesDefinition,
    StopAction,
    Subscribable,
    Subscription,
    TODO,
    TagsFrom,
    ToChildren,
    ToExecutableAction,
    ToStateValue,
    TransitionActorLogic,
    TransitionActorRef,
    TransitionConfig,
    TransitionConfigOrTarget,
    TransitionConfigTarget,
    TransitionDefinition,
    TransitionDefinitionMap,
    TransitionSnapshot,
    TransitionTarget,
    Transitions,
    TransitionsConfig,
    UnifiedArg,
    UnknownAction,
    UnknownActorLogic,
    UnknownActorRef,
    UnknownMachineConfig,
    Values,
    WithDynamicParams,
};
