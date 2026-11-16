import type { Component, Own } from '../component.js';
import type { EffectOf, PropsOf } from '@pterror/interact-core';
import type { list as source } from '@pterror/interact-core/list';
export type Widget = typeof source;
export type WidgetProps = PropsOf<Widget>;
export type ListParts = 'option' | 'root';
export type ListProps = Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{
    type: 'active';
}>>, unknown, 'source'>;
/** @import { Component, Own } from '../component.js' */
/** @import { EffectOf, PropsOf } from '@pterror/interact-core' */
/** @import { list as source } from '@pterror/interact-core/list' */
/** @typedef {typeof source} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/** @typedef {'option' | 'root'} ListParts */
/** @typedef {Own<WidgetProps, 'selected', NonNullable<WidgetProps['selected']>['value'], Extract<EffectOf<Widget>, Readonly<{ type: 'active' }>>, unknown, 'source'>} ListProps */
/**
 * A listbox over a collection the host holds (on a server, say): the WAI-ARIA listbox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single selection, selection not following focus. It draws
 * a window of `rows` options and holds one more key each side of it, so every drawn option's neighbours are
 * known. Keys come from the host by `ask` about its `source`; only the answer to the latest ask is used, and
 * `changed` asks again. The window follows the active option, and, once an option's size is `measured`, the
 * list's `scroll` offset. Characters typed are typeahead: the host finds the option they start (`ask` with
 * `find`), and only the answer to the latest find is used. Shown with nothing selected and nothing active, or
 * focused so, the first option is active. Given a visible label outside it (`label`), it is named by it. With
 * `hover`, the option under the pointer becomes active. Selection is the value, by the contract's rule: with
 * `selected` in its props (not `null`), a choice shows at once and is pending until the props confirm it or the
 * app refuses it. The list emits `active` whenever the active option it draws changes, so a parent can name it
 * (`aria-activedescendant`) without reading the list's state.
 * @type {Component<ListProps, ListParts>}
 */
declare const List: Component<ListProps, ListParts>;
export { List };
