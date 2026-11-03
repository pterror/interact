/**
 * The radial menu's layout: eight slots evenly around a circle, starting at the top and going clockwise, each a dot
 * with its label beside it. Labels on the right half sit right of their dot, left-aligned; labels on the left half
 * sit left of it, right-aligned; the top and bottom slots go right.
 */
import type { ActiveCommand } from './search.js';
/** @import { ActiveCommand } from './search.js' */
declare const SVG = "http://www.w3.org/2000/svg";
/** Always eight slots, so each direction keeps its place */
declare const SLOTS = 8;
/**
 * The line from the centre to a slot, dimmed when the slot is empty
 * @param {number} slot - Which
 * @param {boolean} filled - Whether a command is in it
 * @returns {SVGLineElement} The line
 */
declare function spokeOf(slot: number, filled: boolean): SVGLineElement;
/**
 * A slot holding a command: a hit area bigger than its dot, the dot, and the label
 * @param {number} slot - Which
 * @param {ActiveCommand} entry - Its command, and whether it applies
 * @returns {SVGGElement} The slot
 */
declare function slotOf(slot: number, { active, command }: ActiveCommand): SVGGElement;
/**
 * Shows on a slot whether it's the active one, and whether its command applies
 * @param {SVGGElement} group - The slot
 * @param {Readonly<{ enabled: boolean, on: boolean }>} state - Whether it applies, and whether it's active
 * @returns {void}
 */
declare function paintSlot(group: SVGGElement, { enabled, on }: Readonly<{
    enabled: boolean;
    on: boolean;
}>): void;
/**
 * Places the menu's SVG around a point, with room for the labels
 * @param {SVGSVGElement} frame - The SVG
 * @param {Readonly<{ x: number, y: number }>} centre - The point, in viewport pixels
 * @returns {void}
 */
declare function placeFrame(frame: SVGSVGElement, { x, y }: Readonly<{
    x: number;
    y: number;
}>): void;
export { SLOTS, SVG, paintSlot, placeFrame, slotOf, spokeOf };
