import { SubscriberInternals } from './subscriber-internals.js';

export function closeSubscription(
  subscriberInternals: SubscriberInternals<any>,
  reason?: unknown,
): void {
  if (!subscriberInternals.active) {
    return;
  }

  subscriberInternals.active = false;
  subscriberInternals.subscriptionController.abort(reason);

  for (let i: number = subscriberInternals.teardownCallbacks.length - 1; i >= 0; i--) {
    try {
      subscriberInternals.teardownCallbacks[i]();
    } catch (error: unknown) {
      reportError(error);
    }
  }
}
