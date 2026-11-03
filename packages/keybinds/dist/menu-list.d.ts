/**
 * A context menu's list: an item for each command, a separator between categories, which item is active, and what the
 * pointer and keys do to it. Both context menus show their commands through one.
 */
import type { InputUI } from './input.js';
import type { Move } from './menu-keys.js';
import type { ActiveCommand } from './search.js';
/** The list of commands in a context menu, and which is active */
declare class MenuList {
    #private;
    /**
     * Lists commands in a list element
     * @param {HTMLUListElement} list - Where the items go
     * @param {(index: number) => void} choose - Runs the command at an index
     */
    constructor(list: HTMLUListElement, choose: (index: number) => void);
    /** @returns {number} Which item is active, -1 for none */
    get active(): number;
    /** @returns {readonly ActiveCommand[]} The commands shown */
    get rows(): readonly ActiveCommand[];
    /**
     * Shows commands, keeping which is active, with anything to follow them
     * @param {readonly ActiveCommand[]} rows - The commands, and whether each applies
     * @param {readonly InputUI[]} inputs - How bindings are shown
     * @param {readonly HTMLLIElement[]} [after] - What follows the commands in the list
     * @returns {void}
     */
    show(rows: readonly ActiveCommand[], inputs: readonly InputUI[], after?: readonly HTMLLIElement[]): void;
    /**
     * An item's command, if it's shown and applies
     * @param {number} index - Which item
     * @returns {ActiveCommand | undefined} The command, if it can run
     */
    applying(index: number): ActiveCommand | undefined;
    /**
     * What a key does: moves the active item, runs it, or closes the menu
     * @param {KeyboardEvent} event - The key going down
     * @param {Readonly<{ close: () => void, inSearch: boolean }>} menu - Closes the menu, and whether the key was
     *   pressed in its search field
     * @returns {void}
     */
    key(event: KeyboardEvent, { close, inSearch }: Readonly<{
        close: () => void;
        inSearch: boolean;
    }>): void;
    /**
     * Starts over as on opening: nothing active, and the pointer leading
     * @returns {void}
     */
    reset(): void;
    /**
     * Moves the active item by keys: down or up a step, wrapping, or to either end
     * @param {Move} where - Which way
     * @returns {void}
     */
    move(where: Move): void;
    /**
     * Hears the pointer: moving it, over an item, and clicking one
     * @param {Event} event - A click, mousemove or mouseover
     * @returns {void}
     */
    handleEvent(event: Event): void;
}
export { MenuList };
