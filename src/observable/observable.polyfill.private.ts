import { Observable } from './observable.js';

export function observablePolyfill(): void {
  if (!Reflect.has(globalThis, 'Observable')) {
    (globalThis as any).Observable = Observable;
  }
}
