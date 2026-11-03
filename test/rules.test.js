import { describe, expect, spyOn, test } from 'bun:test'

import {
  escapes,
  importEveryModule,
  manifests,
  outsideDependencies,
  sideEffectsBeyondStylesheets,
  styleRules,
  stylesheetViolations,
  typeEscapes,
  zeroSpecificity,
} from './repo.js'

describe('packages', () => {
  test('depend at runtime on nothing outside this repo', async () => {
    expect(outsideDependencies(await manifests())).toEqual([])
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

  test('are checked for exactly that', () => {
    const rules = styleRules('@layer a { :where(.x)::part(y) { color: red } .z { color: red } } :where(.w) {}')
    expect(rules.map(({ layered, selector }) => [zeroSpecificity(selector), layered])).toEqual([
      [true, true],
      [false, true],
      [true, false],
    ])
  })
})

describe('JavaScript', () => {
  test('never casts, silences the checker, or uses any', async () => {
    expect(await typeEscapes()).toEqual([])
  })

  test('is checked for exactly that', () => {
    const cast = '/** @type {Element} */ (node)'
    const typed = '/** @type {Element[]} */\nconst found = []'
    expect(escapes(cast)).toEqual(['a JSDoc cast'])
    expect(escapes(typed)).toEqual([])
    expect(escapes('// @ts-ignore')).toEqual(['a @ts- directive'])
    expect(escapes('/** @param {any} value - It */')).toEqual(['any'])
    expect(escapes('/** @returns {Promise<*>} It */')).toEqual(['any'])
  })
})
