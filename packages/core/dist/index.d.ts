/**
 * interact's core, as a proof: the contract, composition, the pending-change rule, five widgets, the host (with list
 * sources and announcement words), the page binding web renderers share, what generated components share, and the
 * DOM and terminal renderers.
 */
export { describedAt, formValue, givenFrom, heldAt, heldFrom, holding, hostOptions, inForm, itemSources, itemsProp, outsideElement, outsideIds, ownValue, propsAt, route, widgetProps, } from './components.js';
export { compose, deliver, isRecord, resolve, same, start } from './compose.js';
export { part, ref } from './contract.js';
export { dialog } from './dialog.js';
export { prefixedIds } from './dom-ids.js';
export { renderDom } from './dom.js';
export { arraySource, host } from './host.js';
export { list } from './list.js';
export { menu } from './menu.js';
export { change, fromApp, pending, refuse, shown } from './pending.js';
export { reorderList } from './reorder.js';
export { select } from './select.js';
export { identity } from './target.js';
export { layout, parseInput, renderTerminal } from './terminal.js';
export { ARIA_STATES, attributesOf, elementFor, idOf, itemText, page, partName, statesOf } from './web.js';
export { announcement, english, say } from './words.js';
export type Key = import('./contract.js').Key;
export type Description = import('./components.js').Description;
export type Given = import('./components.js').Given;
export type Held = import('./components.js').Held;
export type HostGiven = import('./components.js').HostGiven;
export type Item = import('./components.js').Item;
export type Sourced<P, S extends string> = import('./components.js').Sourced<P, S>;
export type Names = import('./components.js').Names;
export type OutsideGiven = import('./components.js').OutsideGiven;
export type Props = import('./components.js').Props;
export type Routed = import('./components.js').Routed;
export type AnyWidget = import('./compose.js').AnyWidget;
export type PropsOf<W> = import('./compose.js').PropsOf<W>;
export type EffectOf<W> = import('./compose.js').EffectOf<W>;
export type Ref = import('./contract.js').Ref;
export type Node = import('./compose.js').Node;
export type Out = import('./compose.js').Out;
export type Host = import('./host.js').Host;
export type Source = import('./host.js').Source;
export type Naming = import('./web.js').Naming;
export type Page = import('./web.js').Page;
export type PageOptions = import('./web.js').PageOptions;
export type Words = import('./words.js').Words;
/** @typedef {import('./contract.js').Key} Key */
/** @typedef {import('./components.js').Description} Description */
/** @typedef {import('./components.js').Given} Given */
/** @typedef {import('./components.js').Held} Held */
/** @typedef {import('./components.js').HostGiven} HostGiven */
/** @typedef {import('./components.js').Item} Item */
/** @template P @template {string} S @typedef {import('./components.js').Sourced<P, S>} Sourced */
/** @typedef {import('./components.js').Names} Names */
/** @typedef {import('./components.js').OutsideGiven} OutsideGiven */
/** @typedef {import('./components.js').Props} Props */
/** @typedef {import('./components.js').Routed} Routed */
/** @typedef {import('./compose.js').AnyWidget} AnyWidget */
/** @template W @typedef {import('./compose.js').PropsOf<W>} PropsOf */
/** @template W @typedef {import('./compose.js').EffectOf<W>} EffectOf */
/** @typedef {import('./contract.js').Ref} Ref */
/** @typedef {import('./compose.js').Node} Node */
/** @typedef {import('./compose.js').Out} Out */
/** @typedef {import('./host.js').Host} Host */
/** @typedef {import('./host.js').Source} Source */
/** @typedef {import('./web.js').Naming} Naming */
/** @typedef {import('./web.js').Page} Page */
/** @typedef {import('./web.js').PageOptions} PageOptions */
/** @typedef {import('./words.js').Words} Words */
