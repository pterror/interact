import type { Component, Own } from '../component.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
import type { menu as source } from '@pterror/interact-core/menu';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type MenuParts = 'button' | 'item' | 'menu' | 'root';
export type MenuProps = Own<WidgetProps, never, never, Extract<EffectOf<Widget>, Readonly<{
    type: 'activate';
}>>, unknown>;
/** @import { Component, Own } from '../component.js' */
/** @import { EffectOf, PropsOf } from '@pterror/interact-core' */
/** @import { menu as source } from '@pterror/interact-core/menu' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'button' | 'item' | 'menu' | 'root'} MenuParts */
/** @typedef {Own<WidgetProps, never, never, Extract<EffectOf<Widget>, Readonly<{ type: 'activate' }>>, unknown>} MenuProps */
/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/),
 * focus moved to each item in turn. Items are few and the app's, so they come in the props with their text,
 * which typeahead reads. Choosing an item emits `activate`; disabled items are moved to but not chosen.
 * @type {Component<MenuProps, MenuParts>}
 */
declare const Menu: Component<MenuProps, MenuParts>;
export { Menu };
