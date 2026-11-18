/** @import { Target } from './compose.js' */
import type { Target } from './compose.js';
/**
 * A stable internal identity for a structured part, independent of any renderer's naming.
 * @param {Target} target - The part
 * @returns {string} Its identity, keeping paths and opaque string/number keys distinct
 */
declare function identity(target: Target): string;
export { identity };
