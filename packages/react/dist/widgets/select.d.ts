import type { Component, Own } from '../interact.js';
import type { PropsOf } from '@pterror/interact-core';
import type { select as source } from '@pterror/interact-core/select';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type SelectParts = 'root' | 'trigger' | 'option' | 'list';
export type SelectProps = Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown>;
/** @import { Component, Own } from '../interact.js' */
/** @import { PropsOf } from '@pterror/interact-core' */
/** @import { select as source } from '@pterror/interact-core/select' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'root' | 'trigger' | 'option' | 'list'} SelectParts */
/** @typedef {Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown>} SelectProps */
/**
 * A select: the WAI-ARIA select-only combobox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), a trigger and a list.
 * Focus stays on the trigger, which names the active option by `aria-activedescendant`, known from the list's
 * `active` effects; the list is the windowed `list`, given the select's value as its own, so it only reports
 * what was chosen. The value follows the contract's rule: with `value` in its props, a choice shows at once and
 * is pending until the props confirm it or the app refuses it.
 * @type {Component<SelectProps, SelectParts>}
 */
declare const Select: Component<SelectProps, SelectParts>;
export { Select };
