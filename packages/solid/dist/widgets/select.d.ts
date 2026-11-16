import type { Component, Own } from '../component.js';
import type { PropsOf } from '@pterror/interact-core';
import type { select as source } from '@pterror/interact-core/select';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type SelectParts = 'popover' | 'root' | 'trigger' | 'option' | 'list';
export type SelectProps = Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown, 'source'>;
/** @import { Component, Own } from '../component.js' */
/** @import { PropsOf } from '@pterror/interact-core' */
/** @import { select as source } from '@pterror/interact-core/select' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'popover' | 'root' | 'trigger' | 'option' | 'list'} SelectParts */
/** @typedef {Own<WidgetProps, 'value', NonNullable<WidgetProps['value']>['value'], never, unknown, 'source'>} SelectProps */
/**
 * A select: the WAI-ARIA select-only combobox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), a trigger and a list, the
 * list in a popup against the trigger. Focus stays on the trigger, which names the active option by
 * `aria-activedescendant`, known from the list's `active` effects; the list is the windowed `list`, given the
 * select's value as its own, so it only reports what was chosen. The value follows the contract's rule: with
 * `value` in its props, a choice shows at once and is pending until the props confirm it or the app refuses it.
 * A character typed opens it and is the list's typeahead; Space is typed too while a prefix is being typed
 * (`until`). Given a visible label outside it (`label`), the trigger and the list are named by it, and a click
 * on it focuses the trigger. A mouse press on the trigger opens (or closes) it at once, and its release over an
 * option chooses that option, as a native select does; the click the press ends in is then not a toggle
 * (`pressed`). The option under the pointer is active.
 * @type {Component<SelectProps, SelectParts>}
 */
declare const Select: Component<SelectProps, SelectParts>;
export { Select };
