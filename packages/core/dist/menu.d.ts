/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/), the
 * menu a popup against the button, focus moved to each item in turn. Items are the keys of a collection the host holds (`source`), asked for whole, since a
 * menu draws every item: a first page, then the rest once the count is known; only the answer to the latest ask is
 * used, and `changed` asks again. The host draws each item. Characters typed are typeahead, which the host finds
 * (`ask` with `find`). Choosing an item emits `activate`; disabled items are moved to but not chosen.
 */
import type { Answer, Ask, Changed, Click, Focus, Found, i32, i53, Key, KeyDown, PreventDefault, PropsInput, SourceName, Time, View, Wake, Widget } from './contract.js';
export type MenuProps = Readonly<{
    label: string;
    source: SourceName;
    disabled: readonly Key[];
}>;
export type MenuState = Readonly<{
    label: string;
    source: string;
    disabled: readonly Key[];
    keys: readonly Key[];
    count: i32 | null;
    asked: i53;
    open: boolean;
    opening: 'first' | 'last' | null;
    active: Key | null;
    prefix: string;
    until: number;
    sought: i53;
}>;
export type MenuInput = KeyDown | Click | Time | PropsInput<MenuProps> | Answer | Found | Changed;
export type MenuEffect = Ask | Focus | PreventDefault | Wake | Readonly<{
    type: 'activate';
    item: Key;
}>;
/**
 * The view
 * @param {MenuState} state - The menu
 * @returns {View} Its parts
 */
declare function view(state: MenuState): View;
/** @type {Widget<MenuProps, MenuState, MenuInput, MenuEffect>} */
declare const menu: Widget<MenuProps, MenuState, MenuInput, MenuEffect>;
export { menu, view as menuView };
