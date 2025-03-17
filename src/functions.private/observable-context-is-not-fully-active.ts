import { isFullyActive } from './is-fully-active.js';

export function observableContextIsNotFullyActive(): boolean {
  return (
    'self' in globalThis &&
    'Window' in globalThis &&
    globalThis.self instanceof globalThis.Window &&
    !isFullyActive(globalThis.self)
  );
}
