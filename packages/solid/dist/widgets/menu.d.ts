import type { Component, Make, Own } from '../component.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
import type { menu as source } from '@pterror/interact-core/menu';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type MenuParts = 'button' | 'item' | 'menu' | 'root';
export type MenuProps = Own<WidgetProps, never, never, Extract<EffectOf<Widget>, Readonly<{
    type: 'activate';
}>>, unknown, 'source'>;
/** @import { Component, Make, Own } from '../component.js' */
/** @import { EffectOf, PropsOf } from '@pterror/interact-core' */
/** @import { menu as source } from '@pterror/interact-core/menu' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'button' | 'item' | 'menu' | 'root'} MenuParts */
/** @typedef {Own<WidgetProps, never, never, Extract<EffectOf<Widget>, Readonly<{ type: 'activate' }>>, unknown, 'source'>} MenuProps */
/**
 * Makes `Menu` with an entry's `component`
 * @param {Make} component - The entry's `component`
 * @returns {Component<MenuProps, MenuParts>} The component
 */
declare function menuWith(component: Make): Component<MenuProps, MenuParts>;
export { menuWith };
