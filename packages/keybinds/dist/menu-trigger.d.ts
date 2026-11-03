/**
 * Opening a context menu where the page is right-clicked: on an element named by the menu's `target` attribute, or
 * on its parent.
 */
import type { Point } from './menu-place.js';
/** Whether a menu opens where its target is right-clicked, as its `auto-trigger` attribute says */
declare class MenuTrigger {
    #private;
    /**
     * Opens a menu at a point
     * @param {(point: Point) => void} open - Opens it there
     */
    constructor(open: (point: Point) => void);
    /**
     * Starts or stops opening a menu where its target is right-clicked
     * @param {HTMLElement} menu - The menu
     * @param {boolean} on - Whether it should
     * @returns {void}
     */
    set(menu: HTMLElement, on: boolean): void;
}
export { MenuTrigger };
