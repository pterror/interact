/**
 * A hub's default `adapt`: a definition that is a command, checked to be one.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { CommandDefinition } from './hub-commands.js'
 */

/**
 * A field of a definition beyond what its type says, if it has one of its own
 * @param {CommandDefinition} definition - The definition
 * @param {string} field - The field
 * @returns {unknown} Its value, or undefined if it has none
 */
function extra(definition, field) {
  return Object.hasOwn(definition, field) ? Reflect.get(definition, field) : undefined
}

/**
 * Whether a value is a list of strings
 * @param {unknown} value - The value
 * @returns {value is readonly string[]} Whether it is
 */
function isStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * A field that must be absent or one type
 * @template V
 * @param {CommandDefinition} definition - The definition
 * @param {string} field - The field
 * @param {(value: unknown) => value is V} is - Whether a value is of its type
 * @returns {V | undefined} Its value, or undefined if absent
 * @throws {TypeError} If it holds anything else
 */
function optional(definition, field, is) {
  const value = extra(definition, field)
  if (value !== undefined && !is(value)) {
    throw new TypeError(`"${definition.id}" has a ${field} that isn't one`)
  }
  return value
}

/**
 * @param {unknown} value - A value
 * @returns {value is boolean} Whether it's a boolean
 */
function isBoolean(value) {
  return typeof value === 'boolean'
}

/**
 * @param {unknown} value - A value
 * @returns {value is number} Whether it's a number
 */
function isNumber(value) {
  return typeof value === 'number'
}

/**
 * @param {unknown} value - A value
 * @returns {value is string | readonly string[]} Whether it's menu tags
 */
function isMenu(value) {
  return typeof value === 'string' || isStrings(value)
}

/**
 * @param {unknown} value - A value
 * @returns {value is Function} Whether it's a function
 */
function isFunction(value) {
  return typeof value === 'function'
}

/**
 * A definition's `when`, as a command's: whether its answer is truthy
 * @param {CommandDefinition} definition - The definition
 * @returns {((ctx: Context) => boolean) | undefined} The condition, or undefined if it has none
 * @throws {TypeError} If its `when` isn't a function
 */
function whenOf(definition) {
  const when = optional(definition, 'when', isFunction)
  return when === undefined ? undefined : (context) => Boolean(Reflect.apply(when, definition, [context]))
}

/**
 * A definition as a command, when it is one: it has a function to run, and each field a command has beyond a
 * definition's is absent or of the command's type. The default `adapt`
 * @param {CommandDefinition} definition - The definition
 * @returns {Command} The command, running the definition's `execute`
 * @throws {TypeError} If it has no `execute` function, so the hub needs an `adapt` for it, or a field of the wrong type
 */
function commandOf(definition) {
  const run = optional(definition, 'execute', isFunction)
  if (run === undefined) {
    throw new TypeError(`"${definition.id}" has no execute function; give the hub an adapt for its definitions`)
  }
  return {
    ...definition,
    anyModifiers: optional(definition, 'anyModifiers', isBoolean),
    captureInput: optional(definition, 'captureInput', isBoolean),
    execute: (context, event) => {
      /** @type {unknown} */
      const result = Reflect.apply(run, definition, [context, event])
      return result
    },
    menu: optional(definition, 'menu', isMenu),
    rank: optional(definition, 'rank', isNumber),
    when: whenOf(definition),
  }
}

export { commandOf }
