import { Subscriber } from './subscriber.js';

export function subscriberPolyfill(): void {
  if (!Reflect.has(globalThis, 'Subscriber')) {
    (globalThis as any).Subscriber = Subscriber;
  }
}
