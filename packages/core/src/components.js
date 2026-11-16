/**
 * What every framework's generated components share: a widget described for a component, the widget's props that a
 * component's props give, and where an effect that reaches the app goes. A component passes some of the widget's props
 * through as they are, binds one value (the prop a `change` effect from the widget itself is about), turns the
 * widget's other own effects into events, and may take another component's props inside one of the widget's props (a
 * dialog's `content`). Which framework names each of these is the framework's: this works on the widget's names.
 */

import { isRecord } from './compose.js'

/** @import { AnyGenerated, Out } from './compose.js' */
/** @import { Data, Key, Path } from './contract.js' */
/** @import { Source } from './host.js' */
/** @import { Naming, PageOptions } from './web.js' */
/** @import { Words } from './words.js' */

/**
 * The value a component binds: the widget's prop, whether the widget takes it as `{ value }` (with `null` for none
 * given: the select's `value`) or as it is (the dialog's `open`), the value before any is given or chosen, and what it
 * holds as an attribute can give it (a key as text)
 * @typedef {Readonly<{ prop: string, wrapped: boolean, empty: Data, kind: 'string' | 'number' | 'boolean' | 'other' }>} Bound
 */

/**
 * A widget as a component runs it (its generated in-place code): its props passed through, its bound value, the types of its own effects that are
 * the app's, and the widget props that take another component's props (by that component's description)
 * @typedef {Readonly<{
 *   widget: AnyGenerated,
 *   props: readonly string[],
 *   value: Bound | null,
 *   events: readonly string[],
 *   inside: Readonly<{ [prop: string]: Description }>,
 * }>} Description
 */

/**
 * A component's props in the widget's names: each prop passed through, the bound value as it shows now (the app's,
 * or the component's own), and the props of each component inside
 * @typedef {Readonly<{ [prop: string]: unknown }>} Given
 */

/**
 * Where an effect that reached the app goes: the component it is for (the props it is inside, from the outermost),
 * and either the bound value it changes (with the change's id) or the event it is
 * @typedef {Readonly<{ inside: readonly string[], change: Readonly<{ value: unknown, id: number }> }>
 *   | Readonly<{ inside: readonly string[], event: string, effect: Readonly<{ [field: string]: unknown }> }>} Routed
 */

/**
 * A framework's props as a record
 * @typedef {Readonly<{ [prop: string]: unknown }>} Props
 */

/**
 * The names a framework gives a bound value's props: the value's, and the one holding where the component's own value
 * starts (React's `value` and `defaultValue`; Vue's `modelValue` and `defaultValue`)
 * @typedef {Readonly<{ value: (prop: string) => string, initial: (prop: string) => string }>} Names
 */

/**
 * The values a component holds for bound values the app doesn't give: its own, and those of the components inside
 * @typedef {Readonly<{ value: unknown, inside: Readonly<{ [prop: string]: Held }> }>} Held
 */

/**
 * An element outside a component that its widget refers to, as an app gives it: its id (which a server draws), the
 * element, or what holds it (a React ref's `current`, a Vue ref's `value`, a function giving it)
 * @typedef {string | Element | Readonly<{ current: Element | null }> | Readonly<{ value: Element | null }>
 *   | (() => Element | null) | null | undefined} OutsideGiven
 */

/**
 * The ids of the elements outside a component given by id, by name, for its naming
 * @param {Readonly<{ [name: string]: OutsideGiven }> | undefined} given - The elements outside, by name
 * @returns {Readonly<{ [name: string]: string }> | undefined} Their ids, or none if none is given by id
 */
function outsideIds(given) {
  /** @type {{ [name: string]: string }} */
  const ids = {}
  for (const [name, one] of Object.entries(given ?? {})) {
    if (typeof one === 'string') {
      ids[name] = one
    }
  }
  return Object.keys(ids).length === 0 ? undefined : ids
}

/**
 * An element outside a component given as an element, or by what holds it, as it is now
 * @param {Readonly<{ [name: string]: unknown }> | undefined} given - The elements outside, by name
 * @param {string} name - Which
 * @returns {Element | null} The element, or `null` for one given by id or not at all
 */
function outsideElement(given, name) {
  const one = given?.[name]
  /** @type {unknown} */
  const held =
    typeof one === 'function'
      ? Reflect.apply(one, undefined, [])
      : isRecord(one) && !(one instanceof Element)
        ? (one['current'] ?? one['value'])
        : one
  return held instanceof Element ? held : null
}

/**
 * What a component takes beside its widget's props, in every framework: how an item is named in announcements, how
 * ids are made, the sources the widget asks about, the words announcements use, key rebinding, and the elements
 * outside it the widget refers to, by the names it gives them
 * @typedef {Readonly<{
 *   name?: ((key: Key) => string) | undefined,
 *   naming?: Naming | undefined,
 *   sources?: Readonly<{ [name: string]: Source }> | undefined,
 *   translate?: ((input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null) | undefined,
 *   words?: Words | undefined,
 *   outside?: Readonly<{ [name: string]: OutsideGiven }> | undefined,
 * }>} HostGiven
 */

/**
 * The page's options from a component's host props: its naming (the app's, or the framework's) with the ids of the
 * elements outside given by id, the elements outside given otherwise as they are when the page looks, and the rest as
 * given
 * @param {HostGiven} props - The component's props
 * @param {Naming} framework - The naming the framework makes, from its ids
 * @param {() => HostGiven} latest - The component's props as they are now
 * @returns {Omit<PageOptions, 'widget' | 'props' | 'effect'> & Readonly<{ naming: Naming }>} The options
 */
function hostOptions(props, framework, latest) {
  const { name, sources, translate, words } = props
  const naming = props.naming ?? framework
  const ids = outsideIds(props.outside)
  return {
    naming: ids === undefined ? naming : { ...naming, outside: { ...naming.outside, ...ids } },
    outside: (named) => outsideElement(latest().outside, named),
    ...(name === undefined ? {} : { name }),
    ...(sources === undefined ? {} : { sources }),
    ...(translate === undefined ? {} : { translate }),
    ...(words === undefined ? {} : { words }),
  }
}

/**
 * The props given to the component inside a prop
 * @param {Props} props - The props
 * @param {string} name - The prop
 * @returns {Props} Its props, or none
 */
function propsIn(props, name) {
  const inner = props[name]
  return isRecord(inner) ? inner : {}
}

/**
 * The props given to a component, from the outermost one's
 * @param {Props} props - The outermost component's props
 * @param {readonly string[]} inside - The component, by the props it is inside
 * @returns {Props} Its props
 */
function propsAt(props, inside) {
  return inside.reduce((at, name) => propsIn(at, name), props)
}

/**
 * The values a component holds at first: each bound value where the props start it, or its empty value
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {Names} names - The framework's names
 * @returns {Held} What it holds
 */
function heldFrom(description, props, names) {
  const { value } = description
  /** @type {{ [prop: string]: Held }} */
  const inside = {}
  for (const [name, inner] of Object.entries(description.inside)) {
    inside[name] = heldFrom(inner, propsIn(props, name), names)
  }
  const initial = value === null ? undefined : props[names.initial(value.prop)]
  return { inside, value: initial === undefined ? (value?.empty ?? null) : initial }
}

/**
 * Whether a component's bound value is its own: the app gives none
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {Names} names - The framework's names
 * @returns {boolean} Whether it is
 */
function ownValue(description, props, names) {
  const { value } = description
  return value !== null && props[names.value(value.prop)] === undefined
}

/**
 * A component's props in the widget's names: its bound value the app's, or its own
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {Held} held - What it holds
 * @param {Names} names - The framework's names
 * @returns {Given} Its props, in the widget's names
 */
function givenFrom(description, props, held, names) {
  /** @type {{ [prop: string]: unknown }} */
  const given = {}
  for (const name of description.props) {
    given[name] = props[name]
  }
  const { value } = description
  if (value !== null) {
    given[value.prop] = ownValue(description, props, names) ? held.value : props[names.value(value.prop)]
  }
  for (const [name, inner] of Object.entries(description.inside)) {
    given[name] = givenFrom(inner, propsIn(props, name), held.inside[name] ?? heldFrom(inner, {}, names), names)
  }
  return given
}

/**
 * What is held, with one component's value changed
 * @param {Held} held - What is held
 * @param {readonly string[]} inside - The component, by the props it is inside
 * @param {unknown} value - The value
 * @returns {Held} What is held after
 */
function holding(held, inside, value) {
  const [name, ...rest] = inside
  if (name === undefined) {
    return { ...held, value }
  }
  const inner = held.inside[name] ?? { inside: {}, value: null }
  return { ...held, inside: { ...held.inside, [name]: holding(inner, rest, value) } }
}

/**
 * The value held for a component
 * @param {Held} held - What is held
 * @param {readonly string[]} inside - The component, by the props it is inside
 * @returns {unknown} Its value
 */
function heldAt(held, inside) {
  let at = held
  for (const name of inside) {
    at = at.inside[name] ?? { inside: {}, value: null }
  }
  return at.value
}

/**
 * The widget's props, from a component's props in the widget's names
 * @param {Description} description - The component's widget
 * @param {Given} given - Its props
 * @returns {Readonly<{ [prop: string]: unknown }>} The widget's props
 */
function widgetProps(description, given) {
  /** @type {{ [prop: string]: unknown }} */
  const props = {}
  for (const name of description.props) {
    props[name] = given[name]
  }
  const { value } = description
  if (value !== null) {
    const now = given[value.prop] === undefined ? value.empty : given[value.prop]
    props[value.prop] = value.wrapped ? { value: now } : now
  }
  for (const [name, inner] of Object.entries(description.inside)) {
    const nested = given[name]
    props[name] = widgetProps(inner, isRecord(nested) ? nested : {})
  }
  return props
}

/**
 * Where an effect that reached the app goes, or `null` for one no component takes: a `change` from a widget with a
 * bound value changes it; any other effect of a type the widget names as its own is an event
 * @param {Description} description - The outermost component's widget
 * @param {Out} out - The effect, with where it came from
 * @returns {Routed | null} Where it goes
 */
function route(description, out) {
  /** @type {string[]} */
  const inside = []
  let at = description
  /** @type {Path} */
  let from = out.from
  for (let next = at.inside[from[0] ?? '']; next !== undefined; next = at.inside[from[0] ?? '']) {
    inside.push(from[0] ?? '')
    at = next
    from = from.slice(1)
  }
  const record = out.effect
  if (!isRecord(record)) {
    return null
  }
  const type = String(record['type'])
  if (type === 'change' && at.value !== null && from.length === 0) {
    return { change: { id: Number(record['id']), value: record['value'] }, inside }
  }
  return at.events.includes(type) ? { effect: record, event: type, inside } : null
}

/**
 * The description of the component a route goes to
 * @param {Description} description - The outermost component's widget
 * @param {readonly string[]} inside - The props it is inside
 * @returns {Description} Its widget
 */
function describedAt(description, inside) {
  let at = description
  for (const name of inside) {
    const next = at.inside[name]
    if (next === undefined) {
      throw new TypeError(`No component inside ${name}`)
    }
    at = next
  }
  return at
}

export {
  describedAt,
  givenFrom,
  heldAt,
  heldFrom,
  holding,
  hostOptions,
  outsideElement,
  outsideIds,
  ownValue,
  propsAt,
  route,
  widgetProps,
}
