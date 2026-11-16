/**
 * The generator: reads a package's widgets, checks them against the source subset, and gives each widget's in-place
 * JavaScript (with declarations typing it as its source is typed) and LuaJIT, or why the Lua can't be made exactly.
 */

import { effectsOf, factoryKnown } from './effects.js'
import { printJs } from './js.js'
import { lower } from './lower.js'
import { printLua } from './lua.js'
import { plan } from './plan.js'
import { load } from './program.js'
import { checkWidths } from './widths.js'

/** @import { Source } from './program.js' */

/**
 * Where a package's widgets are, and where the generated modules find what they import
 * @typedef {Readonly<{
 *   tsconfig: string,
 *   index: string,
 *   root: string,
 *   header: string,
 *   source: (module: string) => string,
 * }>} Options
 */

/**
 * One widget, generated
 * @typedef {Readonly<{ name: string, js: string, dts: string, lua: string | null, refused: readonly string[] }>} Generated
 */

/**
 * Checks a package's widgets against the source subset
 * @param {Pick<Options, 'tsconfig' | 'index' | 'root'>} options - Where they are
 * @returns {readonly string[]} Every rule broken, as `file:line:column: message`
 */
function check(options) {
  const source = load(options.tsconfig)
  const lowered = lower(source, options.index, options.root)
  return [...lowered.diagnostics, ...checkWidths(lowered.widgets, source.checker, options.root).diagnostics]
}

/**
 * Generates every widget a package's index exports
 * @param {Options} options - Where they are, and where the output imports from
 * @returns {Readonly<{ diagnostics: readonly string[], widgets: readonly Generated[] }>} What the subset check found
 *   (nothing is generated if it found anything), and each widget
 */
function generate(options) {
  return generateFrom(load(options.tsconfig), options)
}

/**
 * Generates every widget an index exports, from a program already read
 * @param {Source} source - The program
 * @param {Omit<Options, 'tsconfig'>} options - Where the widgets are, and where the output imports from
 * @returns {Readonly<{ diagnostics: readonly string[], widgets: readonly Generated[] }>} As `generate` gives
 */
function generateFrom(source, options) {
  const lowered = lower(source, options.index, options.root)
  const widths = checkWidths(lowered.widgets, source.checker, options.root)
  if (lowered.diagnostics.length > 0 || widths.diagnostics.length > 0) {
    return { diagnostics: [...lowered.diagnostics, ...widths.diagnostics], widgets: [] }
  }
  const plans = lowered.widgets.map((widget) => plan(widget, source.checker))
  const effects = new Map(plans.map((planned) => [planned.widget.name, effectsOf(planned, factoryKnown(planned))]))
  const widgets = plans.map((planned) => {
    const { widget } = planned
    const { dts, js } = printJs(planned, options, effects)
    const header = options.header
      .split('\n')
      .map((line) => line.replace(/^\/\/ ?/u, '-- '))
      .join('\n')
    const lua = printLua(planned, source.checker, { header, ranges: widths.ranges }, effects)
    return {
      dts,
      js,
      lua: 'lua' in lua ? lua.lua : null,
      name: widget.name,
      refused: 'refused' in lua ? lua.refused : [],
    }
  })
  return { diagnostics: [], widgets }
}

export { check, generate, generateFrom }
