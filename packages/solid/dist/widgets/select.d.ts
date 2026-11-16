import type { Component, Make, Own } from '../component.js';
import type { PropsOf } from '@pterror/interact-core';
import type { select as source } from '@pterror/interact-core/select';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type SelectParts = 'popover' | 'root' | 'trigger' | 'option' | 'list';
export type SelectProps = Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown, 'source'>;
/** @import { Component, Make, Own } from '../component.js' */
/** @import { PropsOf } from '@pterror/interact-core' */
/** @import { select as source } from '@pterror/interact-core/select' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'popover' | 'root' | 'trigger' | 'option' | 'list'} SelectParts */
/** @typedef {Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown, 'source'>} SelectProps */
/**
 * Makes `Select` with an entry's `component`
 * @param {Make} component - The entry's `component`
 * @returns {Component<SelectProps, SelectParts>} The component
 */
declare function selectWith(component: Make): Component<SelectProps, SelectParts>;
export { selectWith };
