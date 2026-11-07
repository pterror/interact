/**
 * A rectangle: its top-left corner and its size.
 * @typedef {Readonly<{ x: number, y: number, width: number, height: number }>} Rect
 */

/**
 * A size.
 * @typedef {Readonly<{ width: number, height: number }>} Size
 */

/**
 * Which side of its anchor something goes on, in the direction text runs: after it in the block direction (below, in
 * horizontal text), before it, or before or after it in the inline direction.
 * @typedef {'block-start' | 'block-end' | 'inline-start' | 'inline-end'} Side
 */

/**
 * How something lines up with its anchor along that side: their starts, their centres, or their ends.
 * @typedef {'start' | 'center' | 'end'} Align
 */

/**
 * The direction inline text runs.
 * @typedef {'ltr' | 'rtl'} Direction
 */

/**
 * Where to put something: what it is anchored to (a point is a rectangle of no size), its size, the area it has to
 * stay in, which side and alignment it prefers, the gap to leave from the anchor and the margin to keep from the area's
 * edges, and which way text runs.
 * @typedef {Readonly<{
 *   anchor: Rect,
 *   size: Size,
 *   bounds: Rect,
 *   side: Side,
 *   align: Align,
 *   gap: number,
 *   margin: number,
 *   direction: Direction,
 * }>} Wanted
 */

/**
 * Where it goes: its top-left corner, the side it ended up on, and how much room it has on that side and across it,
 * so it can shrink to fit when it is too big for either.
 * @typedef {Readonly<{ x: number, y: number, side: Side, available: Size }>} Placed
 */

/** @typedef {'top' | 'bottom' | 'left' | 'right'} Edge */

/** @type {Readonly<Record<Edge, Edge>>} */
const OPPOSITE = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' }

/**
 * The edge of the anchor a side is in the physical world.
 * @param {Side} side - The side
 * @param {Direction} direction - Which way text runs
 * @returns {Edge} The edge
 */
function edgeOf(side, direction) {
  if (side === 'block-start') {
    return 'top'
  }
  if (side === 'block-end') {
    return 'bottom'
  }
  const forwards = direction === 'ltr'
  return (side === 'inline-end') === forwards ? 'right' : 'left'
}

/**
 * The side an edge is, in the direction text runs.
 * @param {Edge} edge - The edge
 * @param {Direction} direction - Which way text runs
 * @returns {Side} The side
 */
function sideOf(edge, direction) {
  if (edge === 'top') {
    return 'block-start'
  }
  if (edge === 'bottom') {
    return 'block-end'
  }
  return (edge === 'right') === (direction === 'ltr') ? 'inline-end' : 'inline-start'
}

/**
 * The room between the anchor and the area's edge on one side, less the gap and the margin.
 * @param {Wanted} wanted - The placement wanted
 * @param {Edge} edge - The side
 * @returns {number} The room, never below none
 */
function roomOn(wanted, edge) {
  const { anchor, bounds, gap, margin } = wanted
  const spare = gap + margin
  /** @type {Readonly<Record<Edge, number>>} */
  const rooms = {
    bottom: bounds.y + bounds.height - (anchor.y + anchor.height) - spare,
    left: anchor.x - bounds.x - spare,
    right: bounds.x + bounds.width - (anchor.x + anchor.width) - spare,
    top: anchor.y - bounds.y - spare,
  }
  return Math.max(rooms[edge], 0)
}

/**
 * Whether an edge runs along the vertical, so the main axis is horizontal.
 * @param {Edge} edge - The edge
 * @returns {boolean} Whether it does
 */
function sideways(edge) {
  return edge === 'left' || edge === 'right'
}

/**
 * The edge to use: the one wanted if it fits, else its opposite if that fits, else whichever has more room.
 * @param {Wanted} wanted - The placement wanted
 * @returns {Edge} The edge
 */
function chooseEdge(wanted) {
  const preferred = edgeOf(wanted.side, wanted.direction)
  const opposite = OPPOSITE[preferred]
  const need = sideways(preferred) ? wanted.size.width : wanted.size.height
  const here = roomOn(wanted, preferred)
  const there = roomOn(wanted, opposite)
  if (here >= need) {
    return preferred
  }
  if (there >= need) {
    return opposite
  }
  return here >= there ? preferred : opposite
}

/**
 * Where something lines up across the anchor's side: by their starts, centres or ends, with start at the far end when
 * `reversed` (inline text running right to left).
 * @param {number} start - Where the anchor starts across that axis
 * @param {number} length - The anchor's extent across it
 * @param {number} size - The size placed across it
 * @param {Align} align - How it lines up
 * @param {boolean} reversed - Whether start is at the far end
 * @returns {number} Its coordinate
 */
function across(start, length, size, align, reversed) {
  if (align === 'center') {
    return start + (length - size) / 2
  }
  return (align === 'start') !== reversed ? start : start + length - size
}

/**
 * Where something goes beside an anchor: on the side wanted, or the opposite one when that is the only one it fits,
 * or the roomier one when it fits neither; lined up as wanted, then moved along the side as little as it takes to stay
 * in the area. It never leaves the area, overlapping the anchor if it must; `available` says how much room it has, so
 * it can shrink instead.
 * @param {Wanted} wanted - The placement wanted
 * @returns {Placed} Where it goes
 */
function place(wanted) {
  const { align, anchor, bounds, direction, gap, margin, size } = wanted
  const edge = chooseEdge(wanted)
  const left = bounds.x + margin
  const right = bounds.x + bounds.width - margin
  const top = bounds.y + margin
  const bottom = bounds.y + bounds.height - margin
  /** @type {Readonly<Record<Edge, number>>} */
  const offEdge = {
    bottom: anchor.y + anchor.height + gap,
    left: anchor.x - gap - size.width,
    right: anchor.x + anchor.width + gap,
    top: anchor.y - gap - size.height,
  }
  const room = roomOn(wanted, edge)
  const beside = sideways(edge)
  const x = beside ? offEdge[edge] : across(anchor.x, anchor.width, size.width, align, direction === 'rtl')
  const y = beside ? across(anchor.y, anchor.height, size.height, align, false) : offEdge[edge]
  return {
    available: beside ? { height: bottom - top, width: room } : { height: room, width: right - left },
    side: sideOf(edge, direction),
    // Moved as little as it takes to stay inside, keeping its start inside when it can't fit
    x: Math.max(left, Math.min(x, right - size.width)),
    y: Math.max(top, Math.min(y, bottom - size.height)),
  }
}

export { place }
