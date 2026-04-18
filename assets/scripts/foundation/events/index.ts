import { EventTarget } from 'cc';

import { EventBus } from './event-bus';
import { GameEventType, GameEvents } from './game.events';

export * from './event-bus';
export * from './game.events';

export const eventBus = new EventBus<GameEvents>(new EventTarget());
