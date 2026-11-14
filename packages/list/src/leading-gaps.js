/**
 * Where a drop would land in a row or column of items: the dragged item takes slot n as soon as its leading edge, in
 * the direction it travels, enters the item that holds slot n. Travelling forward the leading edge is its end, and it
 * enters an item when it passes that item's start as laid out with the dragged item before it; travelling back it is
 * its start, entering an item when it passes that item's end as laid out with the dragged item after it. The direction
 * turns only once the pointer comes back further than `turn` from the furthest point it reached; until then the slot
 * is the one that furthest point gave, so smaller moves back change nothing.
 *
 * Items are measured where they are laid out, so items drawn elsewhere by their `translate` (to make room, or
 * following the pointer) don't move the gaps. The dragged item is taken to be where it was drawn when the drag began
 * (part-way through settling, if it was), moved as far as the pointer since; so when the items move under it (a
 * scroll, items added or taken out) it keeps to the pointer, and they are measured again at each question.
 */

import { laidOut, translated } from './translated.js'

/** How far back, in pixels, the pointer comes before the direction of travel turns */
const TURN = 6

/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K, element: Element }> | undefined,
 *   axis: 'x' | 'y',
 *   turn?: number,
 * }>} LeadingGapsOptions
 */

/**
 * A drop's place: next to `target`, after it or before it
 * @template K
 * @typedef {Readonly<{ target: K, after: boolean }>} Gap
 */

/**
 * The drag a question is about: the key dragged and where the pointer was pressed, the same record throughout a drag
 * @template K
 * @typedef {Readonly<{ key: K, from: Readonly<{ x: number, y: number }> }>} Pressed
 */

/**
 * The direction of travel, -1 back, 1 forward, 0 before the pointer has gone either way; and the furthest offset from
 * the press reached that way since it last turned
 * @typedef {Readonly<{ direction: -1 | 0 | 1, furthest: number }>} Travel
 */

/** @type {Travel} */
const STILL = { direction: 0, furthest: 0 }

/**
 * The direction of travel once the pointer is `offset` from the press
 * @param {Travel} travel - The direction before
 * @param {number} offset - Pixels from the press along the axis
 * @param {number} turn - Pixels back before it turns
 * @returns {Travel} The direction now
 */
function travelled(travel, offset, turn) {
  if (travel.direction === 0) {
    return offset === 0 ? travel : { direction: offset > 0 ? 1 : -1, furthest: offset }
  }
  if ((offset - travel.furthest) * travel.direction > 0) {
    return { direction: travel.direction, furthest: offset }
  }
  if ((travel.furthest - offset) * travel.direction > turn) {
    return { direction: travel.direction === 1 ? -1 : 1, furthest: offset }
  }
  return travel
}

/**
 * The slot the dragged item holds, as an index among the other items
 * @param {readonly Readonly<{ start: number, size: number }>[]} extents - Every item where it is laid out, in order
 * @param {number} from - The dragged item's index
 * @param {number} offset - How far the dragged item is drawn from where it is laid out
 * @param {-1 | 0 | 1} direction - Which way it travels
 * @returns {number} The slot
 */
function slotAt(extents, from, offset, direction) {
  const own = extents[from]
  if (own === undefined || direction === 0) {
    return from
  }
  const next = extents[from + 1]
  const previous = extents[from - 1]
  // How far an item moves when the dragged item goes from before it to after it: its size and the gap after it.
  let step = own.size
  if (next !== undefined) {
    step = next.start - own.start
  } else if (previous !== undefined) {
    step = own.start + own.size - (previous.start + previous.size)
  }
  const at = own.start + offset
  let slot = 0
  for (const [index, each] of extents.entries()) {
    if (index === from) {
      continue
    }
    const start = index < from ? each.start : each.start - step
    const passed = direction === 1 ? at + own.size > start + step : at >= start + each.size
    if (!passed) {
      break
    }
    slot += 1
  }
  return slot
}

/**
 * Finds the gap a dragged item's leading edge is in
 * @template K
 * @param {LeadingGapsOptions<K>} options - The element the items are drawn in, as its children in order; the item an
 *   element is; which way they run, across (`x`) or down (`y`); and how far back, in pixels, the pointer comes before
 *   the direction turns (left out: 6)
 * @returns {(point: Readonly<{ x: number, y: number }>, drag: Pressed<K>) => Gap<K> | undefined} The gap for a drag
 *   with the pointer at a point in the viewport: the dragged item itself while it holds its own slot, none if it
 *   isn't drawn
 */
function leadingGaps({ axis, element, itemOf, turn = TURN }) {
  /** @type {Pressed<K> | undefined} */
  let current = undefined
  let grabbed = 0
  let drawnAt = 0
  let travel = STILL
  return (point, drag) => {
    /** @type {Readonly<{ key: K, element: Element }>[]} */
    const items = []
    for (const child of element.children) {
      const item = itemOf(child)
      if (item?.element === child) {
        items.push(item)
      }
    }
    const from = items.findIndex((item) => item.key === drag.key)
    const own = items[from]
    if (own === undefined) {
      return undefined
    }
    const extents = items.map((item) => laidOut(item.element, axis))
    const layout = extents[from]?.start ?? 0
    if (drag !== current) {
      current = drag
      grabbed = translated(own.element)[axis]
      drawnAt = layout + grabbed
      travel = STILL
    }
    travel = travelled(travel, drawnAt + point[axis] - drag.from[axis] - layout - grabbed, turn)
    const slot = slotAt(extents, from, grabbed + travel.furthest, travel.direction)
    const target = items[slot]
    if (slot === from || target === undefined) {
      return { after: false, target: drag.key }
    }
    return { after: slot > from, target: target.key }
  }
}

export { leadingGaps }
