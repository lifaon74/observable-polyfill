import { observableContextIsNotFullyActive } from '../functions.private/observable-context-is-not-fully-active.js';
import { type InternalObserver } from '../observable/internals.private/internal-observer.js';
import { type VoidFunction } from '../shared/void-function.js';
import { closeSubscription } from './internals.private/close-subscription.js';
import {
  getSubscriberInternals,
  setSubscriberInternals,
  type SubscriberInternals,
} from './internals.private/subscriber-internals.js';

export class Subscriber<GValue> {
  constructor() {
    setSubscriberInternals(this, {
      observers: new Set<InternalObserver<GValue>>(),
      teardownCallbacks: [],
      subscriptionController: new AbortController(),
      active: true,
    });
  }

  get active(): boolean {
    return getSubscriberInternals<GValue>(this).active;
  }

  get signal(): AbortSignal {
    return getSubscriberInternals<GValue>(this).subscriptionController.signal;
  }

  next(value: GValue): void {
    const internals: SubscriberInternals<GValue> = getSubscriberInternals<GValue>(this);

    if (!internals.active || observableContextIsNotFullyActive()) {
      return;
    }

    for (const observer of internals.observers) {
      observer.next(value);
    }
  }

  error(error?: unknown): void {
    const internals: SubscriberInternals<GValue> = getSubscriberInternals<GValue>(this);

    if (!internals.active) {
      return reportError(error);
    }

    if (observableContextIsNotFullyActive()) {
      return;
    }

    closeSubscription(getSubscriberInternals<GValue>(this));

    for (const observer of internals.observers) {
      observer.error(error);
    }
  }

  complete(): void {
    const internals: SubscriberInternals<GValue> = getSubscriberInternals<GValue>(this);

    if (!internals.active || observableContextIsNotFullyActive()) {
      return;
    }

    closeSubscription(getSubscriberInternals<GValue>(this));

    for (const observer of internals.observers) {
      observer.complete();
    }
  }

  addTeardown(teardown: VoidFunction): void {
    if (observableContextIsNotFullyActive()) {
      return;
    }

    const internals: SubscriberInternals<GValue> = getSubscriberInternals<GValue>(this);

    if (internals.active) {
      internals.teardownCallbacks.push(teardown);
    } else {
      try {
        teardown();
      } catch (error: unknown) {
        reportError(error);
      }
    }
  }
}
