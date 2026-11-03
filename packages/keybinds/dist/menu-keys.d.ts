/**
 * What a key does in a context menu: move the active item, choose it, or close the menu.
 */
export type Move = 'down' | 'end' | 'home' | 'up';
export type MenuAction = Move | 'choose' | 'close';
/**
 * What a key does in a menu: move the active item, choose it, or close
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {boolean} inSearch - Whether it was pressed in the menu's search field
 * @returns {MenuAction | undefined} What it does, if anything
 */
declare function menuKey(key: string, inSearch: boolean): MenuAction | undefined;
export { menuKey };
