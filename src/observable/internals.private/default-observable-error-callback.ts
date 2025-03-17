import { type ObservableErrorCallback } from '../observable.js';

export const DEFAULT_OBSERVABLE_ERROR_CALLBACK: ObservableErrorCallback = (
  error?: unknown,
): void => {
  reportError(error);
};
