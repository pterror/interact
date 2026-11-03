/**
 * Holding and tapping: "k:hold" runs once a key or button has been held for a while, "k:tap" when it comes up before
 * that. Together they give one key two jobs.
 */
import type { Phase } from './core.js';
/**
 * For keybinds({ holds: holds() })
 * @param {Readonly<{ delay?: number }>} [options] - How long a press is held before it's a hold, in ms (default 500)
 * @returns {Phase} The phase that runs hold and tap bindings
 */
declare function holds({ delay }?: Readonly<{
    delay?: number;
}>): Phase;
export { holds };
