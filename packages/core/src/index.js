/**
 * interact's core, as a proof: the contract, composition, the pending-change rule, five widgets, the host (with list
 * sources and announcement words), the page binding web renderers share, what generated components share, and the
 * DOM and terminal renderers.
 */

export {
  describedAt,
  givenFrom,
  heldAt,
  heldFrom,
  holding,
  ownValue,
  propsAt,
  route,
  widgetProps,
} from './components.js'
export { compose, deliver, isRecord, resolve, same, start } from './compose.js'
export { part, ref } from './contract.js'
export { dialog } from './dialog.js'
export { renderDom } from './dom.js'
export { arraySource, host } from './host.js'
export { list } from './list.js'
export { menu } from './menu.js'
export { change, fromApp, pending, refuse, shown } from './pending.js'
export { reorderList } from './reorder.js'
export { select } from './select.js'
export { layout, parseInput, renderTerminal } from './terminal.js'
export { ARIA_STATES, attributesOf, elementFor, identity, idOf, page, partName, statesOf } from './web.js'
export { announcement, english, say } from './words.js'

/** @typedef {import('./contract.js').Key} Key */
/** @typedef {import('./components.js').Description} Description */
/** @typedef {import('./components.js').Given} Given */
/** @typedef {import('./components.js').Held} Held */
/** @typedef {import('./components.js').Names} Names */
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
