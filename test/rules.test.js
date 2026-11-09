import { describe, expect, spyOn, test } from 'bun:test'

import {
  escapes,
  importEveryModule,
  javascriptFiles,
  licenseMismatches,
  manifests,
  outsideDependencies,
  packageFiles,
  shippedModules,
  shippedStyles,
  stylesIn,
  stylesheetFiles,
  typeEscapes,
  withSideEffects,
} from './repo.js'

describe('packages', () => {
  test('depend at runtime on nothing outside this repo, but an adapter on the framework it adapts', async () => {
    expect(outsideDependencies(await manifests())).toEqual(['@pterror/interact-solid -> solid-js'])
  })

  test('name in their README the license their manifest gives', async () => {
    expect(await licenseMismatches()).toEqual([])
  })

  test('declare that importing them has no side effects', async () => {
    expect(withSideEffects(await manifests())).toEqual([])
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
  test('are shipped by no package, as a file or in a module', async () => {
    expect(await shippedStyles()).toEqual([])
  })

  test('are looked for in every package and its modules', async () => {
    const [files, modules] = await Promise.all([packageFiles(), shippedModules()])
    const found = new Set([...files, ...modules])
    const known = [
      'packages/keybinds/README.md',
      'packages/keybinds/src/radial-menu.js',
      'packages/list/src/popover.js',
    ]
    expect(known.filter((path) => !found.has(path))).toEqual([])
    expect(modules.filter((path) => path.endsWith('.test.js') || path.includes('/test-'))).toEqual([])
  })

  test('are found by exactly that', () => {
    // Each sample is built from pieces, so this file's own text holds none of them
    expect(stylesheetFiles(['a/b.css', 'a/b.js', 'a/css.md'])).toEqual(['a/b.css'])
    expect(stylesIn(['new CSS', 'StyleSheet()'].join(''))).toEqual(['a constructed stylesheet'])
    expect(stylesIn(['root.adopted', 'StyleSheets = []'].join(''))).toEqual(['adopted stylesheets'])
    expect(stylesIn(['sheet.insert', 'Rule(rule)'].join(''))).toEqual(['an inserted rule'])
    expect(stylesIn(["document.createElement('st", "yle')"].join(''))).toEqual(['a style element'])
    expect(stylesIn(['`<st', 'yle>a {}</style>`'].join(''))).toEqual(['a style element'])
    expect(stylesIn(["import './a.c", "ss'"].join(''))).toEqual(['an imported stylesheet'])
    expect(stylesIn(["await import('./a.c", "ss')"].join(''))).toEqual(['an imported stylesheet'])
    expect(stylesIn("element.style.left = '4px'")).toEqual([])
  })
})

describe('JavaScript', () => {
  test('never casts, silences the checker, or uses any', async () => {
    expect(await typeEscapes()).toEqual([])
  })

  test('is looked for in every package and the tests', async () => {
    const found = new Set(await javascriptFiles())
    const known = [
      'packages/keybinds/src/keybinds.js',
      'packages/list/src/render.js',
      'packages/solid/src/to-watched.js',
      'scripts/release.js',
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
