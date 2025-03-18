import { ObservableEventListenerOptions } from './event-target/event-target.when.js';
import { Observable } from './observable/observable.js';
import { Subscriber } from './subscriber/subscriber.js';

declare global {
  interface EventTarget {
    when<GEvent extends Event>(
      type: string,
      options?: ObservableEventListenerOptions,
    ): Observable<GEvent>;
  }

  interface Window {
    Observable: typeof Observable;
    Subscriber: typeof Subscriber;
  }
}
