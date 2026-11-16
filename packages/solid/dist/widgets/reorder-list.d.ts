import type { Component, Make, Own } from '../component.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
import type { reorderList as source } from '@pterror/interact-core/reorder';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type ReorderListParts = 'option' | 'root';
export type ReorderListProps = Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{
    type: 'active';
}>>, unknown, 'source'>;
/** @import { Component, Make, Own } from '../component.js' */
/** @import { EffectOf, PropsOf } from '@pterror/interact-core' */
/** @import { reorderList as source } from '@pterror/interact-core/reorder' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'option' | 'root'} ReorderListParts */
/** @typedef {Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{ type: 'active' }>>, unknown, 'source'>} ReorderListProps */
/**
 * Makes `ReorderList` with an entry's `component`
 * @param {Make} component - The entry's `component`
 * @returns {Component<ReorderListProps, ReorderListParts>} The component
 */
declare function reorderListWith(component: Make): Component<ReorderListProps, ReorderListParts>;
export { reorderListWith };
