import { InternalObserver } from '../../observable/internals.private/internal-observer.js';
import { VoidFunction } from '../../shared/void-function.js';
import { Subscriber } from '../subscriber.js';

export interface SubscriberInternals<GValue> {
  readonly observers: Set<InternalObserver<GValue>>;
  readonly teardownCallbacks: VoidFunction[];
  readonly subscriptionController: AbortController;

  active: boolean;
}

const SUBSCRIBERS_INTERNALS = new WeakMap<Subscriber<any>, SubscriberInternals<any>>();

export function setSubscriberInternals<GValue>(
  instance: Subscriber<GValue>,
  internals: SubscriberInternals<GValue>,
): void {
  SUBSCRIBERS_INTERNALS.set(instance, internals);
}

export function getSubscriberInternals<GValue>(
  instance: Subscriber<GValue>,
): SubscriberInternals<GValue> {
  return SUBSCRIBERS_INTERNALS.get(instance)!;
}
