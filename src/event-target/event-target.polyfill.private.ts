import { type Observable } from '../observable/observable.js';
import { type ObservableEventListenerOptions, when } from './event-target.when.js';

export function eventTargetPolyfill(): void {
  if (!Reflect.has(EventTarget.prototype, 'when')) {
    (EventTarget.prototype as any).when = function <GEvent extends Event>(
      this: EventTarget,
      type: string,
      options?: ObservableEventListenerOptions,
    ): Observable<GEvent> {
      return when(this, type, options);
    };
  }
}
