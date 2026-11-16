import type { Component, Make, Own } from '../component.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
import type { list as source } from '@pterror/interact-core/list';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type ListParts = 'option' | 'root';
export type ListProps = Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{
    type: 'active';
}>>, unknown, 'source'>;
/** @import { Component, Make, Own } from '../component.js' */
/** @import { EffectOf, PropsOf } from '@pterror/interact-core' */
/** @import { list as source } from '@pterror/interact-core/list' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'option' | 'root'} ListParts */
/** @typedef {Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{ type: 'active' }>>, unknown, 'source'>} ListProps */
/**
 * Makes `List` with an entry's `component`
 * @param {Make} component - The entry's `component`
 * @returns {Component<ListProps, ListParts>} The component
 */
declare function listWith(component: Make): Component<ListProps, ListParts>;
export { listWith };
