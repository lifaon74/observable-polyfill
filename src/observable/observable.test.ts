import { describe, expect, test } from 'vitest';
import { Observable } from './observable.js';

// https://github.com/web-platform-tests/wpt/blob/master/dom/observable/tentative/observable-constructor.any.js
// https://github.com/web-platform-tests/wpt/blob/8172a2fe7dc5c86b926b802f54edd1611da0fb18/dom/observable/tentative/observable-constructor.any.js

describe('Observable', (): void => {
  test('subscribe() can be called with no arguments', async () => {
    let initializerCalled = false;
    const source = new Observable(() => {
      initializerCalled = true;
    });

    expect(initializerCalled, 'initializer should not be called by construction').toBe(false);
    source.subscribe();
    expect(initializerCalled, 'initializer should be called by subscribe').toBe(true);
  });
});
