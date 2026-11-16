/**
 * Solid and interact's abstractions, both ways: signals and memos as Values, Watched, Drawn and Sets; Watched and
 * Tests as accessors; a component as what render draws; `Interact`, any interact core widget drawn by Solid; and a
 * component for each of the core's widgets, generated from it. Each is also its own module
 * (`@pterror/interact-solid/to-watched`, ...).
 */
export { component } from './component.js';
export { componentItems } from './component-items.js';
export { fromKeyed } from './from-keyed.js';
export { fromTest } from './from-test.js';
export { fromWatched } from './from-watched.js';
export { Interact } from './interact.js';
export { toDrawn } from './to-drawn.js';
export { toSet } from './to-set.js';
export { toValue } from './to-value.js';
export { toWatched } from './to-watched.js';
export * from './widgets/index.js';
