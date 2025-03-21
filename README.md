[![npm (scoped)](https://img.shields.io/npm/v/wicg-observable-polyfill.svg)](https://www.npmjs.com/package/wicg-observable-polyfill)
![npm](https://img.shields.io/npm/dm/wicg-observable-polyfill.svg)
![NPM](https://img.shields.io/npm/l/wicg-observable-polyfill.svg)
![npm type definitions](https://img.shields.io/npm/types/wicg-observable-polyfill.svg)

## wicg-observable-polyfill

Implementation of the [WICG Observable](https://wicg.github.io/observable/).

Compliant with the `28 February 2025` spec.

> NOTE: this implementation was not written by the WICG. It is done by myself, following stricly the spec, to help everyone adopt Observables.

## 📦 Installation

We may use this package in two ways:

### Polyfill

In this mode, the _primitives_ (`Observable`, `Subscriber`, and `EventTarget`), are happened to `globalThis` and/or the prototype is modified.

#### (recommended) local installation with esm import

```shell
yarn add wicg-observable-polyfill
# or
npm install wicg-observable-polyfill --save
```

```ts
import { polyfill } from 'wicg-observable-polyfill/protected';

polyfill();
```

This is the recommended way, as it allows your bundler (like esbuild) to transpile the code to any `es` version of your choice.

#### using jsdelivr

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/wicg-observable-polyfill@0.1.0/polyfill.protected.min.js"
></script>
```

### Direct primitives consumption

In this mode, we may import directly the primitives (`Observable`, `Subscriber`, and `when`) to consume them:

```ts
import { when, Observable } from 'wicg-observable-polyfill';

when(window, 'click')
  .takeUntil(Observable.from(Promise.resolve(true)))
  .subscribe(/*...*/);
```

## 📜 Documentation

The WICG documentation may be found here: https://wicg.github.io/observable/.

- `wicg-observable-polyfill` exports: `Observable`, `Subscriber`, and `when`
- `wicg-observable-polyfill/protected` exports the function `polyfill`
  - when called, it exposes `Observable` and `Subscriber` into `globalThis`, and adds the `when` method to `EventTarget`
  

## Example

### Drag event

```ts
import { when, Observable } from 'wicg-observable-polyfill';

interface Drag {
  readonly originX: number;
  readonly originY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly deltaX: number;
  readonly deltaY: number;
}

when<PointerEvent>(window, 'pointerdown') // or window.when('pointerdown')
  .switchMap((event: PointerEvent): Observable<Drag> => {
    const originX: number = event.clientX;
    const originY: number = event.clientY;

    return when<PointerEvent>(window, 'pointermove')
      .takeUntil(when(window, 'pointerup'))
      .map((event: PointerEvent): Drag => {
        const currentX: number = event.clientX;
        const currentY: number = event.clientY;

        return {
          originX,
          originY,
          currentX,
          currentY,
          deltaX: currentX - originX,
          deltaY: currentY - originY,
        };
      });
  })
  .subscribe((drag: Drag): void => {
    console.log('drag', drag);
  });
```
