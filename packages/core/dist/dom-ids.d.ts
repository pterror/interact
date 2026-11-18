import type { Target } from './compose.js';
/** @import { Target } from './compose.js' */
/**
 * Optional DOM naming from a caller's unique prefix. Encoded structured targets keep arbitrary keys distinct and
 * produce IDs without ASCII whitespace, so the same IDs can be used in ARIA reference lists.
 * @param {string} prefix - Unique in the containing document or shadow root
 * @returns {Readonly<{ idOf: (target: Target) => string }>} The resolver
 */
declare function prefixedIds(prefix: string): Readonly<{
    idOf: (target: Target) => string;
}>;
export { prefixedIds };
