import { eventTargetPolyfill } from './event-target/event-target.polyfill.private.js';
import { observablePolyfill } from './observable/observable.polyfill.private.js';
import { subscriberPolyfill } from './subscriber/subscriber.polyfill.private.js';

export function polyfill(): void {
  observablePolyfill();
  subscriberPolyfill();
  eventTargetPolyfill();
}
