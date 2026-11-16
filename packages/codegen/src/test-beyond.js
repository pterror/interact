/**
 * For the equivalence tests: widgets that use what the core's widgets don't (a `let` changed in a loop, bitwise
 * operators), in the source subset, as text for an in-memory program, with random runs of each
 */

/** @import { LeafRun } from './test-equivalence.js' */

/**
 * The widgets' module
 * @param {string} contract - The path of the core's contract module, absolute
 * @returns {string} The module's text
 */
function beyondSource(contract) {
  return `
/** @import { i32, Result } from '${contract}' */

/** @typedef {Readonly<{ tops: readonly i32[], count: i32, dragged: i32, target: i32, after: boolean }>} SearchState */
/** @typedef {Readonly<{ type: 'move', y: number }>} SearchInput */
/** @typedef {Readonly<{ type: 'show', target: number, after: boolean }>} Show */

/** @type {readonly Show[]} */
const NO_SHOW = []

/**
 * The row under a pixel, by binary search over the rows' tops
 * @param {SearchState} state - The rows
 * @param {SearchInput} input - The pixel
 * @returns {Result<SearchState, Show>} The state; a show when the row or side changed
 */
function searchStep(state, input) {
  const { tops } = state
  const { y } = input
  /** @type {i32} */
  let target = -1
  let after = false
  if (y >= 0 && y < (tops[state.count] ?? 0)) {
    /** @type {i32} */
    let low = 0
    /** @type {i32} */
    let high = (state.count - 1) | 0
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if ((tops[middle] ?? 0) <= y) {
        low = middle
      } else {
        high = (middle - 1) | 0
      }
    }
    if (low !== state.dragged) {
      target = low
      after = y > ((tops[low] ?? 0) + (tops[low + 1] ?? 0)) / 2
    }
  }
  const changed = target !== state.target || after !== state.after
  return [{ ...state, after, target }, changed ? [{ after, target, type: 'show' }] : NO_SHOW]
}

export const search = {
  init: (/** @type {Readonly<{ tops: readonly i32[], dragged: i32 }>} */ props) => [
    { after: false, count: (props.tops.length - 1) | 0, dragged: props.dragged, target: -1, tops: props.tops },
    NO_SHOW,
  ],
  step: searchStep,
}

/** @typedef {Readonly<{ total: number }>} BitsState */
/** @typedef {Readonly<{ type: 'mix', a: number, b: number }>} BitsInput */
/** @typedef {Readonly<{ type: 'mixed', values: readonly number[] }>} Mixed */

/**
 * Every bitwise operator over two numbers, whatever they are
 * @param {BitsState} state - The running total
 * @param {BitsInput} input - The numbers
 * @returns {Result<BitsState, Mixed>} The total; the values made
 */
function bitsStep(state, input) {
  const { a, b } = input
  const values = [a >> 1, a >> b, a << 3, a << b, a >>> 2, a >>> b, a & b, a | b, a ^ b, (a + b) | 0, -a >> 31]
  let total = state.total
  let at = 0
  while (at < values.length) {
    total = (total + (values[at] ?? 0)) % 1000003
    at += 1
  }
  return [{ total }, [{ type: 'mixed', values }]]
}

export const bits = {
  init: () => [{ total: 0 }, []],
  step: bitsStep,
}

/** @typedef {Readonly<{ x: number, y: number }>} Point */
/** @typedef {Readonly<{ at: Point, last: Point, kept: Point, moves: number }>} NestState */
/** @typedef {Readonly<{ type: 'move', x: number, y: number, keep: boolean, reset: boolean }>} NestInput */
/** @typedef {Readonly<{ type: 'kept', point: Point }>} Kept */

/** @type {Point} */
const ORIGIN = { x: 0, y: 0 }

/**
 * Records a state owns, changed by spreads: at and last only read, kept also handed out in an effect
 * @param {NestState} state - The points
 * @param {NestInput} input - The move
 * @returns {Result<NestState, Kept>} The points; the kept one, when kept
 */
function nestStep(state, input) {
  if (input.reset) {
    return [{ ...state, at: ORIGIN, last: { ...state.at } }, []]
  }
  const { at } = state
  const moved = { ...state, at: { ...at, x: at.x + input.x }, last: { ...state.last, y: at.y } }
  const next = { ...moved, at: { ...moved.at, y: moved.at.y + input.y }, moves: state.moves + 1 }
  if (input.keep) {
    return [{ ...next, kept: { ...next.at } }, [{ point: next.kept, type: 'kept' }]]
  }
  return [{ ...next, kept: { ...next.kept, x: next.kept.x + 1 } }, []]
}

export const nest = {
  init: () => [{ at: ORIGIN, kept: { x: 0, y: 0 }, last: ORIGIN, moves: 0 }, []],
  step: nestStep,
}
`
}

/**
 * Random runs of the search: rows of random heights, the pointer anywhere over them and past either end
 * @param {number} seed - The seed
 * @param {number} runs - How many
 * @param {number} length - Inputs in each
 * @returns {LeafRun[]} The runs
 */
function searchRuns(seed, runs, length) {
  let at = seed
  const draw = () => {
    at = (at * 16_807) % 2_147_483_647
    return at
  }
  return Array.from({ length: runs }, () => {
    /** @type {number[]} */
    const tops = [0]
    const count = draw() % 40
    for (let row = 0; row < count; row += 1) {
      tops.push((tops.at(-1) ?? 0) + 10 + (draw() % 50))
    }
    const end = tops.at(-1) ?? 0
    const inputs = Array.from({ length }, () => ({ type: 'move', y: (draw() % (end + 60)) - 30 + (draw() % 4) / 4 }))
    return { inputs, props: { dragged: draw() % (count + 1), tops } }
  })
}

/**
 * Random runs of the bitwise widget: integers, negatives, fractions, and numbers past 2^31 and 2^53
 * @param {number} seed - The seed
 * @param {number} runs - How many
 * @param {number} length - Inputs in each
 * @returns {LeafRun[]} The runs
 */
function bitsRuns(seed, runs, length) {
  let at = seed
  const draw = () => {
    at = (at * 16_807) % 2_147_483_647
    return at
  }
  const number = () => {
    const kind = draw() % 6
    const sign = draw() % 2 === 0 ? 1 : -1
    if (kind === 0) {
      return sign * (draw() % 40)
    }
    if (kind === 1) {
      return (sign * (draw() % 1000)) / 7
    }
    if (kind === 2) {
      return sign * (2 ** 31 + (draw() % 1000))
    }
    if (kind === 3) {
      return sign * (2 ** 53 - (draw() % 1000) * 2)
    }
    if (kind === 4) {
      return sign * (2 ** 32 + 0.5)
    }
    return sign * draw()
  }
  return Array.from({ length: runs }, () => ({
    inputs: Array.from({ length }, () => ({ a: number(), b: number(), type: 'mix' })),
    props: null,
  }))
}

/**
 * Random runs of the nested records' widget
 * @param {number} seed - The seed
 * @param {number} runs - How many
 * @param {number} length - Inputs in each
 * @returns {LeafRun[]} The runs
 */
function nestRuns(seed, runs, length) {
  let at = seed
  const draw = () => {
    at = (at * 16_807) % 2_147_483_647
    return at
  }
  return Array.from({ length: runs }, () => ({
    inputs: Array.from({ length }, () => ({
      keep: draw() % 4 === 0,
      reset: draw() % 6 === 0,
      type: 'move',
      x: (draw() % 21) - 10,
      y: (draw() % 21) - 10,
    })),
    props: null,
  }))
}

export { beyondSource, bitsRuns, nestRuns, searchRuns }
