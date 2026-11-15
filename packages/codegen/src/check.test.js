import { describe, expect, test } from 'bun:test'

import { check } from './generate.js'
import { lower } from './lower.js'
import { loadFiles } from './program.js'

const ROOT = new URL('../../../', import.meta.url).pathname

/**
 * What the subset checker says about a widget whose step has a body, and a module with more before it
 * @param {string} body - The step's body: `state` and `input` are in scope
 * @param {string} more - Declarations before the step
 * @returns {readonly string[]} The diagnostics
 */
function diagnose(body, more = '') {
  const widget = `
/** @typedef {Readonly<{ n: number, name: string, list: readonly number[] }>} S */
/** @typedef {Readonly<{ type: 'go', by: number }>} I */
/** @typedef {Readonly<{ type: 'said', n: number }>} E */
${more}
/**
 * The step
 * @param {S} state - The state
 * @param {I} input - The input
 * @returns {readonly [S, readonly E[]]} The result
 */
function step(state, input) {
${body}
}

export const widget = {
  init: (/** @type {number} */ n) => [{ list: [], n, name: '' }, []],
  step,
  view: () => ({}),
}
`
  const source = loadFiles({ '/v/index.js': "export { widget } from './widget.js'\n", '/v/widget.js': widget })
  return lower(source, '/v/index.js', '/v/').diagnostics
}

describe('the subset checker', () => {
  test("finds nothing in the core's widgets", () => {
    expect(
      check({ index: `${ROOT}packages/core/src/index.js`, root: ROOT, tsconfig: `${ROOT}packages/core/tsconfig.json` }),
    ).toEqual([])
  })

  test('takes plain data, conditions and calls of its own functions', () => {
    expect(
      diagnose(
        "if (input.by > 0 && state.list.includes(input.by)) {\n  return [{ ...state, n: state.n + 1 }, []]\n}\nreturn [state, [{ n: state.n, type: 'said' }]]",
      ),
    ).toEqual([])
  })

  test.each([
    [
      '`undefined` as a value',
      'const none = undefined\nreturn [state, []]',
      'widget.js:13:14: `undefined` is not a value in the subset: use null',
    ],
    [
      'a value that may be undefined, given on',
      'return [{ ...state, n: state.list[0] }, []]',
      'widget.js:13:24: `state.list[0]` may be undefined here: test it (`=== undefined`), default it (`??`) or keep it in a local first',
    ],
    [
      'a number as a condition',
      'if (state.n) {\n  return [state, []]\n}\nreturn [state, []]',
      'widget.js:13:5: `state.n` is number, not a boolean: conditions are booleans (compare it)',
    ],
    [
      'records compared by identity',
      'return [state === state ? state : state, []]',
      'widget.js:13:9: `state === state` compares by identity: plain data has none; compare what identifies it',
    ],
    [
      'a field changed in place',
      'state.n = 1\nreturn [state, []]',
      'widget.js:13:1: a statement that is an expression changes something: only assigning a `let` is in the subset',
    ],
    [
      'an array changed in place',
      'state.list.push(1)\nreturn [state, []]',
      'widget.js:13:1: a statement that is an expression changes something: only assigning a `let` is in the subset',
    ],
    [
      '`new`',
      'const seen = new Set()\nreturn [state, []]',
      'widget.js:13:14: `new` is not in the subset: values are plain data',
    ],
    ['`this`', 'return [this, []]', 'widget.js:13:9: `this` is not in the subset'],
    [
      'a function kept in data',
      'return [{ ...state, n: 0, name: () => 1 }, []]',
      'widget.js:13:33: a function here is a value: functions are only arguments to array methods',
    ],
    [
      '`typeof`',
      "return [typeof state.n === 'number' ? state : state, []]",
      'widget.js:13:9: `typeof` reads what a value is at run time: the subset knows it from its type',
    ],
    [
      'reflection',
      'return [Object.keys(state).length > 0 ? state : state, []]',
      "widget.js:13:9: `Object.keys` reads a value's shape at run time: the subset knows it from its type",
    ],
    [
      'a sort',
      'return [{ ...state, list: state.list.toSorted() }, []]',
      'widget.js:13:27: `toSorted`: a sort with ties depends on whether it is stable; not in the subset',
    ],
    [
      'a Math function an engine may approximate',
      'return [{ ...state, n: Math.hypot(state.n, 1) }, []]',
      "widget.js:13:24: `Math.hypot` may be approximated by the engine (ECMA-262 lets it), so a step's result would depend on where it runs",
    ],
    [
      'a global',
      'return [{ ...state, n: Date.now() }, []]',
      'widget.js:13:24: `Date.now` is outside the widget: not in the subset',
    ],
    ['an exception', "throw new Error('no')", 'widget.js:13:1: a step is total: `throw` is not in the subset'],
    [
      'recursion',
      'return step(state, input)',
      'widget.js:13:8: `step` is reached from itself: the generator takes no recursion',
    ],
  ])('reports %s, where it is', (_, body, message) => {
    expect(diagnose(body)).toContain(message)
  })

  test('reports an optional field of the data, at the field', () => {
    expect(
      diagnose(
        'return [state, []]',
        '/** @typedef {Readonly<{ maybe?: number }>} Unused */\n/** @param {Readonly<{ maybe?: number }>} given - It\n@returns {number} It */\nfunction read(given) { return given.maybe ?? 0 }\nvoid read',
      ),
    ).toEqual([])
    const optional = diagnose(
      'return [{ ...state, n: read({ maybe: 1 }) }, []]',
      '/**\n * Reads it\n * @param {Readonly<{ maybe?: number }>} given - It\n * @returns {number} It\n */\nfunction read(given) {\n  return given.maybe ?? 0\n}',
    )
    expect(optional).toContain(
      'widget.js:7:23: field `maybe` is optional: an absent field reads as undefined; give it a value, null for none',
    )
  })

  test('reports a type that is not known', () => {
    const unknown = ['/** @param {a', 'ny} given - It\n * @returns {number} It */'].join('')
    expect(
      diagnose(
        'return [{ ...state, n: read(1) }, []]',
        `/**\n * Reads it\n ${unknown}\nfunction read(given) {\n  return given\n}`,
      ),
    ).toContain("widget.js:9:15: the type of `given` isn't known (any): every value has a type")
  })
})
