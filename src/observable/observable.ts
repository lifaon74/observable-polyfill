import { linkSignalWithSubscriberInternals } from '../functions.private/link-signal-with-subscriber-internals.js';
import { observableContextIsNotFullyActive } from '../functions.private/observable-context-is-not-fully-active.js';
import { closeSubscription } from '../subscriber/internals.private/close-subscription.js';
import {
  getSubscriberInternals,
  type SubscriberInternals,
} from '../subscriber/internals.private/subscriber-internals.js';
import { Subscriber } from '../subscriber/subscriber.js';
import {
  createInternalObserver,
  createInternalObserverFromSubscriber,
  type InternalObserver,
  isInternalObserver,
} from './internals.private/internal-observer.js';

export interface SubscribeCallback<GValue> {
  (subscriber: Subscriber<GValue>): void;
}

export interface ObservableNextCallback<GValue> {
  (value: GValue): void;
}

export interface ObservableErrorCallback {
  (error?: unknown): void;
}

export interface ObservableCompleteCallback {
  (): void;
}

export interface SubscriptionObserver<GValue> {
  readonly next?: ObservableNextCallback<GValue>;
  readonly error?: ObservableErrorCallback;
  readonly complete?: ObservableCompleteCallback;
}

export interface SubscribeOptions {
  readonly signal?: AbortSignal;
}

export interface ObservableInspectorAbortHandler {
  (reason?: unknown): void;
}

export interface ObservableInspector<GValue> {
  readonly next?: ObservableNextCallback<GValue>;
  readonly error?: ObservableErrorCallback;
  readonly complete?: ObservableCompleteCallback;

  readonly subscribe?: VoidFunction;
  readonly abort?: ObservableInspectorAbortHandler;
}

export interface Predicate<GValue> {
  (value: GValue, index: number): boolean;
}

export interface PredicateStrict<GIn, GOut extends GIn> {
  (value: GIn, index: number): value is GOut;
}

export interface Reducer<GIn, GOut> {
  (accumulator: GOut, currentValue: GIn, index: number): GOut;
}

export interface Mapper<GIn, GOut> {
  (value: GIn, index: number): GOut;
}

export interface Visitor<GValue> {
  (value: GValue, index: number): void;
}

export interface CatchCallback<GValue> {
  (error: unknown): ObservableSource<GValue>;
}

export type ObservableSource<GValue> =
  | Observable<GValue>
  | AsyncIterable<GValue>
  | Iterable<GValue>
  | PromiseLike<GValue>;

export class Observable<GValue> {
  static from<GValue>(input: ObservableSource<GValue>): Observable<GValue> {
    if (typeof input !== 'object') {
      throw new TypeError('Not an object.');
    }

    if (input instanceof Observable) {
      return input;
    }

    if (Reflect.has(input, Symbol.asyncIterator)) {
      return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
        if (subscriber.signal.aborted) {
          return;
        }

        let iterator: AsyncIterator<GValue>;
        try {
          iterator = (input as AsyncIterable<GValue>)[Symbol.asyncIterator]();
        } catch (error: unknown) {
          subscriber.error(error);
          return;
        }

        subscriber.addTeardown((): void => {
          iterator.return?.();
        });

        const next = (): void => {
          if (subscriber.signal.aborted) {
            return;
          }

          let nextPromise: Promise<IteratorResult<GValue>> | undefined;

          try {
            nextPromise = Promise.resolve(iterator.next());
          } catch (error: unknown) {
            nextPromise = Promise.reject(error);
          }

          nextPromise.then(
            (result: IteratorResult<GValue>): void => {
              if (typeof result !== 'object' || result === null) {
                subscriber.error(new TypeError('Not an IteratorResult.'));
                return;
              }

              if (result.done) {
                subscriber.complete();
                return;
              }

              subscriber.next(result.value);
              next();
            },
            (error: unknown): void => {
              subscriber.error(error);
            },
          );
        };

        next();
      });
    }

    if (Reflect.has(input, Symbol.iterator)) {
      return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
        if (subscriber.signal.aborted) {
          return;
        }

        let iterator: Iterator<GValue>;
        try {
          iterator = (input as Iterable<GValue>)[Symbol.iterator]();
        } catch (error: unknown) {
          subscriber.error(error);
          return;
        }

        if (subscriber.signal.aborted) {
          return;
        }

        subscriber.addTeardown((): void => {
          iterator.return?.();
        });

        while (true) {
          let result: IteratorResult<GValue>;
          try {
            result = iterator.next();
          } catch (error: unknown) {
            subscriber.error(error);
            break;
          }

          if (result.done) {
            subscriber.complete();
            return;
          }

          subscriber.next(result.value);

          if (subscriber.signal.aborted) {
            break;
          }
        }
      });
    }

    if (Reflect.has(input, 'then')) {
      return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
        (input as PromiseLike<GValue>).then(
          (value: GValue): void => {
            subscriber.next(value);
            subscriber.complete();
          },
          (error: unknown): void => {
            subscriber.error(error);
          },
        );
      });
    }

    throw new TypeError('Invalid input.');
  }

  readonly #subscribeCallback: SubscribeCallback<GValue>;
  #weakSubscriber: WeakRef<Subscriber<GValue>> | undefined;

  constructor(callback: SubscribeCallback<GValue>) {
    this.#subscribeCallback = callback;
    this.#weakSubscriber = undefined;
  }

  subscribe(
    observerOrNext: ObservableNextCallback<GValue> | SubscriptionObserver<GValue> = {},
    options: SubscribeOptions = {},
  ): void {
    if (observableContextIsNotFullyActive()) {
      return;
    }

    let internalObserver: InternalObserver<GValue>;

    let cleanUpAbort: VoidFunction | undefined;

    if (typeof observerOrNext === 'function') {
      internalObserver = createInternalObserver<GValue>({
        next: observerOrNext,
      });
    } else if (isInternalObserver(observerOrNext)) {
      internalObserver = observerOrNext as InternalObserver<GValue>;
    } else {
      internalObserver = createInternalObserver<GValue>({
        next: Reflect.has(observerOrNext, 'next')
          ? (value: GValue): void => {
              try {
                observerOrNext.next!(value);
              } catch (error: unknown) {
                reportError(error);
              }
            }
          : undefined,
        error: Reflect.has(observerOrNext, 'error')
          ? (error?: unknown): void => {
              try {
                observerOrNext.error!(error);
              } catch (error: unknown) {
                reportError(error);
              } finally {
                cleanUpAbort?.();
              }
            }
          : undefined,
        complete: Reflect.has(observerOrNext, 'complete')
          ? (): void => {
              try {
                observerOrNext.complete!();
              } catch (error: unknown) {
                reportError(error);
              } finally {
                cleanUpAbort?.();
              }
            }
          : undefined,
      });
    }

    if (this.#weakSubscriber !== undefined) {
      const subscriber: Subscriber<GValue> | undefined = this.#weakSubscriber.deref();

      if (subscriber !== undefined) {
        const subscriberInternals: SubscriberInternals<GValue> =
          getSubscriberInternals<GValue>(subscriber);

        if (subscriberInternals.active) {
          subscriberInternals.observers.add(internalObserver);

          if (Reflect.has(options, 'signal')) {
            const signal: AbortSignal = options.signal!;

            if (signal.aborted) {
              subscriberInternals.observers.delete(internalObserver);
            } else {
              cleanUpAbort = linkSignalWithSubscriberInternals(
                signal,
                subscriberInternals,
                internalObserver,
              );
            }
          }

          return;
        }
      }
    }

    const subscriber: Subscriber<GValue> = new Subscriber<GValue>();

    const subscriberInternals: SubscriberInternals<GValue> =
      getSubscriberInternals<GValue>(subscriber);

    subscriberInternals.observers.add(internalObserver);

    this.#weakSubscriber = new WeakRef<Subscriber<GValue>>(subscriber);

    if (Reflect.has(options, 'signal')) {
      const signal: AbortSignal = options.signal!;

      if (signal.aborted) {
        closeSubscription(subscriberInternals, signal.reason);
      } else {
        cleanUpAbort = linkSignalWithSubscriberInternals(
          signal,
          subscriberInternals,
          internalObserver,
        );
      }
    }

    try {
      this.#subscribeCallback(subscriber);
    } catch (error: unknown) {
      subscriber.error(error);
    }
  }

  /* Observable-returning operators */

  takeUntil(value: ObservableSource<any>): Observable<GValue> {
    return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
      const notifier: Observable<any> = Observable.from(value);

      notifier.subscribe(
        createInternalObserver<any>({
          next: (): void => {
            subscriber.complete();
          },
          error: (): void => {
            subscriber.complete();
          },
        }),
        {
          signal: subscriber.signal,
        },
      );

      if (!subscriber.active) {
        return;
      }

      this.subscribe(createInternalObserverFromSubscriber<GValue>(subscriber), {
        signal: subscriber.signal,
      });
    });
  }

  map<GNewValue>(mapper: Mapper<GValue, GNewValue>): Observable<GNewValue> {
    return new Observable<GNewValue>((subscriber: Subscriber<GNewValue>): void => {
      let index: number = 0;

      this.subscribe(
        createInternalObserverFromSubscriber<GValue>(subscriber, {
          next: (value: GValue): void => {
            let mappedResult: GNewValue;
            try {
              mappedResult = mapper(value, index);
            } catch (error: unknown) {
              subscriber.error(error);
              return;
            }
            index++;
            subscriber.next(mappedResult);
          },
        }),
        {
          signal: subscriber.signal,
        },
      );
    });
  }

  filter<GFilteredValue extends GValue>(
    predicate: PredicateStrict<GValue, GFilteredValue>,
  ): Observable<GFilteredValue>;
  filter(predicate: Predicate<GValue>): Observable<GValue>;
  filter(predicate: Predicate<GValue>): Observable<GValue> {
    return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
      let index: number = 0;

      this.subscribe(
        createInternalObserverFromSubscriber<GValue>(subscriber, {
          next: (value: GValue): void => {
            let match: boolean;
            try {
              match = predicate(value, index);
            } catch (error: unknown) {
              subscriber.error(error);
              return;
            }
            index++;
            if (match) {
              subscriber.next(value);
            }
          },
        }),
        {
          signal: subscriber.signal,
        },
      );
    });
  }

  take(amount: number): Observable<GValue> {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError('`amount` must be an integer in range [0, Number.MAX_SAFE_INTEGER]');
    }

    return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
      let remaining: number = amount;

      if (remaining === 0) {
        subscriber.complete();
        return;
      }

      this.subscribe(
        createInternalObserverFromSubscriber<GValue>(subscriber, {
          next: (value: GValue): void => {
            subscriber.next(value);
            remaining--;

            if (remaining === 0) {
              subscriber.complete();
            }
          },
        }),
        {
          signal: subscriber.signal,
        },
      );
    });
  }

  drop(amount: number): Observable<GValue> {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError('`amount` must be an integer in range [0, Number.MAX_SAFE_INTEGER]');
    }

    return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
      let remaining: number = amount;

      if (remaining === 0) {
        subscriber.complete();
        return;
      }

      this.subscribe(
        createInternalObserverFromSubscriber<GValue>(subscriber, {
          next: (value: GValue): void => {
            if (remaining > 0) {
              remaining--;
            } else {
              subscriber.next(value);
            }
          },
        }),
        {
          signal: subscriber.signal,
        },
      );
    });
  }

  flatMap<GNewValue>(mapper: Mapper<GValue, ObservableSource<GNewValue>>): Observable<GNewValue> {
    return new Observable<GNewValue>((subscriber: Subscriber<GNewValue>): void => {
      let index: number = 0;
      let outerSubscriptionHasCompleted: boolean = false;
      let queue: GValue[] = [];
      let activeInnerSubscription: boolean = false;

      const next = (value: GValue): void => {
        let mappedResult: ObservableSource<GNewValue>;
        try {
          mappedResult = mapper(value, index);
        } catch (error) {
          subscriber.error(error);
          return;
        }
        index++;

        let innerObservable: Observable<GNewValue>;
        try {
          innerObservable = Observable.from<GNewValue>(mappedResult);
        } catch (error) {
          subscriber.error(error);
          return;
        }

        innerObservable.subscribe(
          createInternalObserverFromSubscriber<GNewValue>(subscriber, {
            complete: (): void => {
              if (queue.length > 0) {
                next(queue.shift()!);
              } else {
                activeInnerSubscription = false;

                if (outerSubscriptionHasCompleted) {
                  subscriber.complete();
                }
              }
            },
          }),
          {
            signal: subscriber.signal,
          },
        );
      };

      this.subscribe(
        createInternalObserverFromSubscriber<GValue>(subscriber, {
          next: (value: GValue): void => {
            if (activeInnerSubscription) {
              queue.push(value);
            } else {
              activeInnerSubscription = true;
              next(value);
            }
          },
          complete: (): void => {
            outerSubscriptionHasCompleted = true;
            if (!activeInnerSubscription && queue.length === 0) {
              subscriber.complete();
            }
          },
        }),
        {
          signal: subscriber.signal,
        },
      );
    });
  }

  switchMap<GNewValue>(mapper: Mapper<GValue, ObservableSource<GNewValue>>): Observable<GNewValue> {
    return new Observable<GNewValue>((subscriber: Subscriber<GNewValue>): void => {
      let index: number = 0;
      let outerSubscriptionHasCompleted: boolean = false;
      let activeInnerAbortController: AbortController | undefined;

      this.subscribe(
        createInternalObserverFromSubscriber<GValue>(subscriber, {
          next: (value: GValue): void => {
            if (activeInnerAbortController !== undefined) {
              activeInnerAbortController.abort();
            }
            activeInnerAbortController = new AbortController();

            let mappedResult: ObservableSource<GNewValue>;
            try {
              mappedResult = mapper(value, index);
            } catch (error) {
              subscriber.error(error);
              return;
            }
            index++;

            let innerObservable: Observable<GNewValue>;
            try {
              innerObservable = Observable.from<GNewValue>(mappedResult);
            } catch (error) {
              subscriber.error(error);
              return;
            }

            innerObservable.subscribe(
              createInternalObserverFromSubscriber<GNewValue>(subscriber, {
                complete: (): void => {
                  if (outerSubscriptionHasCompleted) {
                    subscriber.complete();
                  } else {
                    activeInnerAbortController = undefined;
                  }
                },
              }),
              {
                signal: AbortSignal.any([activeInnerAbortController!.signal, subscriber.signal]),
              },
            );
          },
          complete: (): void => {
            outerSubscriptionHasCompleted = true;
            if (activeInnerAbortController === undefined) {
              subscriber.complete();
            }
          },
        }),
        {
          signal: subscriber.signal,
        },
      );
    });
  }

  // TODO
  // inspect<GNewValue>(
  //   inspectorOrNext: ObservableInspector<GValue> | SubscriptionObserver<GValue>,
  // ): Observable<GNewValue> {
  //   throw 'TODO';
  // }

  catch<GNewValue>(callback: CatchCallback<GNewValue>): Observable<GValue | GNewValue> {
    return new Observable<GValue | GNewValue>(
      (subscriber: Subscriber<GValue | GNewValue>): void => {
        this.subscribe(
          createInternalObserverFromSubscriber<GValue>(subscriber, {
            error: (error: unknown): void => {
              let result: ObservableSource<GNewValue>;
              try {
                result = callback(error);
              } catch (error) {
                subscriber.error(error);
                return;
              }

              let innerObservable: Observable<GNewValue>;
              try {
                innerObservable = Observable.from<GNewValue>(result);
              } catch (error) {
                subscriber.error(error);
                return;
              }

              innerObservable.subscribe(
                createInternalObserverFromSubscriber<GNewValue>(subscriber),
                {
                  signal: subscriber.signal,
                },
              );
            },
          }),
          {
            signal: subscriber.signal,
          },
        );
      },
    );
  }

  finally(callback: VoidFunction): Observable<GValue> {
    return new Observable<GValue>((subscriber: Subscriber<GValue>): void => {
      subscriber.addTeardown(callback);

      this.subscribe(createInternalObserverFromSubscriber<GValue>(subscriber), {
        signal: subscriber.signal,
      });
    });
  }

  /* Promise-returning operators */

  toArray(options: SubscribeOptions = {}): Promise<readonly GValue[]> {
    return new Promise<readonly GValue[]>(
      (resolve: (value: readonly GValue[]) => void, reject: (reason?: any) => void): void => {
        const { signal }: SubscribeOptions = options;

        signal?.throwIfAborted();

        const end = (): void => {
          signal?.removeEventListener('abort', onAbort);
        };

        const onAbort = (): void => {
          end();
          reject(signal!.reason);
        };

        signal?.addEventListener('abort', onAbort);

        const values: GValue[] = [];

        this.subscribe(
          createInternalObserver<GValue>({
            next: (value: GValue): void => {
              values.push(value);
            },
            error: (error: unknown): void => {
              end();
              reject(error);
            },
            complete: (): void => {
              end();
              resolve(values);
            },
          }),
          options,
        );
      },
    );
  }

  // TODO
  // forEach(callback: Visitor<GValue>, options: SubscribeOptions = {}): Promise<void> {
  //   throw 'TODO';
  // }

  // TODO
  // every(predicate: Predicate<GValue>, options: SubscribeOptions = {}): Promise<boolean> {
  //   throw 'TODO';
  // }

  first(options: SubscribeOptions = {}): Promise<GValue> {
    return new Promise<GValue>(
      (resolve: (value: GValue) => void, reject: (reason?: any) => void): void => {
        const { signal }: SubscribeOptions = options;

        signal?.throwIfAborted();

        const end = (): void => {
          signal?.removeEventListener('abort', onAbort);
        };

        const onAbort = (): void => {
          end();
          reject(signal!.reason);
        };

        signal?.addEventListener('abort', onAbort);

        this.subscribe(
          createInternalObserver<GValue>({
            next: (value: GValue): void => {
              end();
              resolve(value);
            },
            error: (error: unknown): void => {
              end();
              reject(error);
            },
            complete: (): void => {
              end();
              reject(new RangeError('Observable complete before it sent a value.'));
            },
          }),
          options,
        );
      },
    );
  }

  last(options: SubscribeOptions = {}): Promise<GValue> {
    return new Promise<GValue>(
      (resolve: (value: GValue) => void, reject: (reason?: any) => void): void => {
        const { signal }: SubscribeOptions = options;

        signal?.throwIfAborted();

        const end = (): void => {
          signal?.removeEventListener('abort', onAbort);
        };

        const onAbort = (): void => {
          end();
          reject(signal!.reason);
        };

        signal?.addEventListener('abort', onAbort);

        let lastValue: GValue;
        let hasLastValue: boolean = false;

        this.subscribe(
          createInternalObserver<GValue>({
            next: (value: GValue): void => {
              hasLastValue = true;
              lastValue = value;
            },
            error: (error: unknown): void => {
              end();
              reject(error);
            },
            complete: (): void => {
              if (hasLastValue) {
                end();
                resolve(lastValue);
              } else {
                end();
                reject(new RangeError('Observable complete before it sent a value.'));
              }
            },
          }),
          options,
        );
      },
    );
  }

  // TODO
  // find<GFilteredValue extends GValue>(
  //   predicate: PredicateStrict<GValue, GFilteredValue>,
  //   options?: SubscribeOptions,
  // ): Promise<GFilteredValue>;
  // find(predicate: Predicate<GValue>, options?: SubscribeOptions): Promise<GValue>;
  // find(predicate: Predicate<GValue>, options: SubscribeOptions = {}): Promise<GValue> {
  //   throw 'TODO';
  // }

  // TODO
  // some(predicate: Predicate<GValue>, options: SubscribeOptions = {}): Promise<boolean> {
  //   throw 'TODO';
  // }

  // TODO
  // reduce<GReducedValue extends GValue>(
  //   reducer: Reducer<GValue, GReducedValue>,
  //   initialValue?: GReducedValue,
  //   options: SubscribeOptions = {},
  // ): Promise<GReducedValue> {
  //   throw 'TODO';
  // }
}
