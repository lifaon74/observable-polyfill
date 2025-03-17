import { type InternalObserver } from '../observable/internals.private/internal-observer.js';
import { closeSubscription } from '../subscriber/internals.private/close-subscription.js';
import { type SubscriberInternals } from '../subscriber/internals.private/subscriber-internals.js';

export function linkSignalWithSubscriberInternals<GValue>(
  signal: AbortSignal,
  subscriberInternals: SubscriberInternals<GValue>,
  internalObserver: InternalObserver<GValue>,
): () => void {
  const end = (): void => {
    signal.removeEventListener('abort', onAbort);
  };

  const onAbort = (): void => {
    end();

    if (subscriberInternals.active) {
      subscriberInternals.observers.delete(internalObserver);

      if (subscriberInternals.observers.size === 0) {
        closeSubscription(subscriberInternals, signal.reason);
      }
    }
  };

  signal.addEventListener('abort', onAbort);

  return end;
}
