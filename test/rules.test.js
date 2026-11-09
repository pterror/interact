import { describe, expect, spyOn, test } from 'bun:test'

import {
  escapes,
  importEveryModule,
  javascriptFiles,
  manifests,
  outsideDependencies,
  sideEffectsBeyondStylesheets,
  typeEscapes,
} from './repo.js'
import {
  cssTemplates,
  selectorsOf,
  styleRules,
  styledFiles,
  stylesheetViolations,
  zeroSpecificity,
} from './stylesheets.js'

describe('packages', () => {
  test('depend at runtime on nothing outside this repo, but an adapter on the framework it adapts', async () => {
    expect(outsideDependencies(await manifests())).toEqual(['@pterror/interact-solid -> solid-js'])
  })

  test('declare that only stylesheets have side effects', async () => {
    expect(sideEffectsBeyondStylesheets(await manifests())).toEqual([])
  })
})

describe('importing every module', () => {
  test('defines no element and changes no page', async () => {
    const define = spyOn(customElements, 'define')
    const before = document.documentElement.outerHTML
    await importEveryModule()
    expect(define).not.toHaveBeenCalled()
    expect(document.documentElement.outerHTML).toBe(before)
    define.mockRestore()
  })
})

describe('stylesheets', () => {
  test('give every selector zero specificity, inside a cascade layer', async () => {
    expect(await stylesheetViolations()).toEqual([])
  })

  test('are looked for in every package', async () => {
    const found = new Set(await styledFiles())
    const known = [
      'packages/components/src/listbox-styles.js',
      'packages/keybinds/styles/palette.css',
      'packages/theme/tokens.css',
    ]
    expect(known.filter((path) => !found.has(path))).toEqual([])
  })

  test("are read from modules' css`` templates too", () => {
    const sheets = cssTemplates('const a = css`@layer x { :where(p) {} }`\nconst b = css`q {}`')
    expect(sheets).toEqual(['@layer x { :where(p) {} }', 'q {}'])
  })

  test('are checked for exactly that', () => {
    const rules = styleRules('@layer a { :where(.x)::part(y) { color: red } .z { color: red } } :where(.w) {}')
    expect(rules.map(({ layered, selector }) => [zeroSpecificity(selector), layered])).toEqual([
      [true, true],
      [false, true],
      [true, false],
    ])
    expect(selectorsOf(':where(.a, .b) , .c')).toEqual([':where(.a, .b)', '.c'])
  })
})

describe('JavaScript', () => {
  test('never casts, silences the checker, or uses any', async () => {
    expect(await typeEscapes()).toEqual([])
  })

  test('is looked for in every package and the tests', async () => {
    const found = new Set(await javascriptFiles())
    const known = [
      'packages/core/src/selection.js',
      'packages/dom/src/render.js',
      'packages/keybinds/src/core.js',
      'test/repo.js',
    ]
    expect(known.filter((path) => !found.has(path))).toEqual([])
  })

  test('is checked for exactly that', () => {
    // Each sample is built from pieces, so this file's own text holds none of them
    const cast = ['/** @type {Element} */', '(node)'].join(' ')
    const typed = '/** @type {Element[]} */\nconst found = []'
    const multiline = '/**\n * @typedef {Readonly<{ a: string,\n *   b: number }> |\n *   undefined} Pair\n */'
    expect(escapes(cast)).toEqual(['a JSDoc cast'])
    expect(escapes(typed)).toEqual([])
    expect(escapes(multiline)).toEqual([])
    expect(escapes(['// @ts', 'ignore'].join('-'))).toEqual(['a @ts- directive'])
    expect(escapes(['/** @param {a', 'ny} value - It */'].join(''))).toEqual(['any'])
    expect(escapes(['/** @returns {Promise<', '>} It */'].join('*'))).toEqual(['any'])
    expect(escapes(['/** @type {', '} */'].join('*'))).toEqual(['any'])
  })
})
