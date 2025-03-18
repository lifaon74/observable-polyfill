[![npm (scoped)](https://img.shields.io/npm/v/wigc-observable-polyfill.svg)](https://www.npmjs.com/package/wigc-observable-polyfill)
![npm](https://img.shields.io/npm/dm/wigc-observable-polyfill.svg)
![NPM](https://img.shields.io/npm/l/wigc-observable-polyfill.svg)
![npm type definitions](https://img.shields.io/npm/types/wigc-observable-polyfill.svg)

## wigc-observable-polyfill

Implementation of the [WIGC Observable](https://wicg.github.io/observable/).

Compliant with the `28 February 2025` spec.

> NOTE: this implementation was not written by the WIGC. It is done by myself, following stricly the spec, to help everyone adopt Observables.

## 📦 Installation

We may use this package in two ways:

### Polyfill

In this mode, the _primitives_ (`Observable`, `Subscriber`, and `EventTarget`), are happened to `globalThis` and/or the prototype is modified.

#### using jsdelivr

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/wigc-observable-polyfill@0.1.0/polyfill.protected.min.js"
></script>
```

#### local installation with esm import

```shell
yarn add wigc-observable-polyfill
# or
npm install wigc-observable-polyfill --save
```

```ts
import { polyfill } from 'wigc-observable-polyfill/protected';

polyfill();
```

### Direct primitives consumption

In this mode, we may import directly the primitives (`Observable`, `Subscriber`, and `when`) to consume them:

```ts
import { when, Observable } from 'wigc-observable-polyfill';

when(window, 'click')
  .takeUntil(Observable.from(Promise.resolve(true)))
  .subscribe(/*...*/);
```

## 📜 Documentation

The WIGC documentation may be found here: https://wicg.github.io/observable/.

- `wigc-observable-polyfill` exports: `Observable`, `Subscriber`, and `when`
- `wigc-observable-polyfill/protected` export the function `polyfill`
  - when called, it exposes `Observable` and `Subscriber` into `globalThis`, and adds the `when` method to `EventTarget`
  - 
## Example

### Drag event

```ts
import { when, Observable } from 'wigc-observable-polyfill';

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
