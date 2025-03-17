import { Observable } from '../observable/observable.js';
import { type Subscriber } from '../subscriber/subscriber.js';

export interface ObservableEventListenerOptions {
  readonly capture?: boolean;
  readonly passive?: boolean;
}

export function when<GEvent extends Event>(
  target: EventTarget,
  type: string,
  { capture = false, passive }: ObservableEventListenerOptions = {},
): Observable<GEvent> {
  return new Observable<GEvent>((subscriber: Subscriber<GEvent>): void => {
    if (subscriber.signal.aborted) {
      return;
    }

    target.addEventListener(
      type,
      (event: Event): void => {
        subscriber.next(event as GEvent);
      },
      {
        capture,
        passive,
        once: false,
        signal: subscriber.signal,
      },
    );
  });
}
