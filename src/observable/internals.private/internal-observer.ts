import { type Subscriber } from '../../subscriber/subscriber.js';
import {
  type ObservableCompleteCallback,
  type ObservableErrorCallback,
  type ObservableNextCallback,
} from '../observable.js';
import { DEFAULT_OBSERVABLE_COMPLETE_CALLBACK } from './default-observable-complete-callback.js';
import { DEFAULT_OBSERVABLE_ERROR_CALLBACK } from './default-observable-error-callback.js';
import { DEFAULT_OBSERVABLE_NEXT_CALLBACK } from './default-observable-next-callback.js';

export const INTERNAL_OBSERVER = Symbol('INTERNAL_OBSERVER');

export interface InternalObserver<GValue> {
  readonly next: ObservableNextCallback<GValue>;
  readonly error: ObservableErrorCallback;
  readonly complete: ObservableCompleteCallback;
  readonly [INTERNAL_OBSERVER]: any;
}

export function isInternalObserver<GValue>(target: object): target is InternalObserver<GValue> {
  return Reflect.has(target, INTERNAL_OBSERVER);
}

export function createInternalObserver<GValue>({
  next = DEFAULT_OBSERVABLE_NEXT_CALLBACK,
  error = DEFAULT_OBSERVABLE_ERROR_CALLBACK,
  complete = DEFAULT_OBSERVABLE_COMPLETE_CALLBACK,
}: Partial<
  Pick<InternalObserver<GValue>, 'next' | 'error' | 'complete'>
>): InternalObserver<GValue> {
  return {
    next,
    error,
    complete,
    [INTERNAL_OBSERVER]: null,
  };
}

export function createInternalObserverFromSubscriber<GValue>(
  subscriber: Subscriber<any>,
  options: Pick<InternalObserver<GValue>, 'next'> &
    Partial<Pick<InternalObserver<GValue>, 'error' | 'complete'>>,
): InternalObserver<GValue>;
export function createInternalObserverFromSubscriber<GValue>(
  subscriber: Subscriber<GValue>,
  options?: Partial<Pick<InternalObserver<GValue>, 'next' | 'error' | 'complete'>>,
): InternalObserver<GValue>;
export function createInternalObserverFromSubscriber<GValue>(
  subscriber: Subscriber<GValue>,
  {
    next = (value: GValue): void => subscriber.next(value),
    error = (error: unknown): void => subscriber.error(error),
    complete = (): void => subscriber.complete(),
  }: Partial<Pick<InternalObserver<GValue>, 'next' | 'error' | 'complete'>> = {},
): InternalObserver<GValue> {
  return {
    next,
    error,
    complete,
    [INTERNAL_OBSERVER]: null,
  };
}
