/**
 * What both syntaxes' Svelte components run on: a widget described for a component, run by the core's page. The
 * component's own bound value is its bindable prop (`bind:value`, `bind:open`), which a change sets and a refusal sets
 * back; a component inside another (a dialog's content) holds its value unless its props give it. Each of the widget's
 * own effects, and each change, goes to the component's callback for it.
 */

import {
  describedAt,
  givenFrom,
  heldAt,
  heldFrom,
  formValue,
  holding,
  hostOptions,
  itemSources,
  ownValue,
  page,
  propsAt,
  route,
  same,
  widgetProps,
} from '@pterror/interact-core'

/** @import { Description, Key, Names, Naming, Node as Part, Out, OutsideGiven, Page, Props, Source, Words, Sourced } from '@pterror/interact-core' */

/**
 * What a change's callback is given beside the value: `refuse` undoes the change, now or later
 * @typedef {Readonly<{ refuse: () => void }>} Change
 */

/**
 * What every component takes beside its widget's props and its bound value: how an item is named in announcements
 * (`itemName`), the name of its form field (for a value that is a key, held in a hidden input), the sources the widget
 * asks about, the words announcements use, how ids are made, key rebinding, and the elements
 * outside it the widget refers to (its visible `label`), each by id, as an element, or by a function giving it
 * @typedef {Readonly<{
 *   itemName?: ((key: Key) => string) | undefined,
 *   name?: string | undefined,
 *   sources?: Readonly<{ [name: string]: Source }> | undefined,
 *   words?: Words | undefined,
 *   naming?: Naming | undefined,
 *   translate?: ((input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null) | undefined,
 *   outside?: Readonly<{ [name: string]: OutsideGiven }> | undefined,
 * }>} HostProps
 */

/**
 * A component's own props in Svelte 5: the widget's props `P` but its bound value `V` (of type `T`, bound with
 * `bind:`) and the props `I` takes, `onchange` hearing a change to it, an `on` prop for each effect in `E` (given the
 * effect), and `I`, the props of the components inside
 * @template P
 * @template {string} V
 * @template T, E, I
 * @template {string} [S=never]
 * @typedef {Sourced<Omit<P, V | keyof I>, S> & { [K in V]?: T } & { onchange?: (value: T, change: Change) => void } & {
 *   readonly [K in E extends Readonly<{ type: infer N extends string }> ? N : never as `on${K}`]?:
 *     (effect: Extract<E, Readonly<{ type: K }>>) => void
 * } & I} Own
 */

/**
 * What a running component tells its Svelte component: its bound value changed (set it), or an event or change for a
 * callback (`inside` the props of the component it is for, from the outermost)
 * @typedef {Readonly<{
 *   bind: (value: unknown) => void,
 *   call: (name: string, inside: readonly string[], args: readonly unknown[]) => void,
 * }>} Told
 */

/**
 * A component's widget, running: its sources (the app's, and those made from items it is given), and its form field's
 * value (`null` for a widget whose value is no key); `reset` gives its value back what it started as, as a form reset
 * does
 * @typedef {Readonly<{
 *   page: Page,
 *   tree: () => Part,
 *   sources: Readonly<{ [name: string]: Source }> | undefined,
 *   form: () => string | null,
 *   reset: () => void,
 *   update: (props: Props, bound: unknown) => void,
 *   drawn: (within: Element | null) => void,
 *   stop: () => void,
 * }>} Running
 */

/**
 * A word with its first letter capital
 * @param {string} word - The word
 * @returns {string} It, capitalised
 */
function capital(word) {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`
}

/** @type {Names} */
const NAMES = { initial: (prop) => `default${capital(prop)}`, value: (prop) => prop }

/**
 * A component's props with its bound value under the widget's name for it
 * @param {Description} description - The component's widget
 * @param {Props} props - Its props
 * @param {unknown} bound - Its bound value
 * @returns {Props} The props
 */
function withBound(description, props, bound) {
  const { value } = description
  return value === null ? props : { ...props, [value.prop]: bound === undefined ? value.empty : bound }
}

/**
 * Starts a component's widget
 * @param {Description} description - The component's widget
 * @param {Props & HostProps} props - Its props, but its bound value
 * @param {unknown} bound - Its bound value
 * @param {string} id - The id prefix the framework gives it
 * @param {() => Element | null} live - Its live region, once drawn
 * @param {Told} told - What hears its changes and events
 * @returns {Running} The running widget
 */
function start(description, props, bound, id, live, told) {
  const items = itemSources()
  const first = bound
  let held = heldFrom(description, props, NAMES)
  let raw = props
  let boundNow = bound
  let latest = withBound(description, props, bound)

  /**
   * Hears an effect the widget gives the app
   * @param {Out} out - The effect
   * @returns {void}
   */
  const effect = (out) => {
    const routed = route(description, out)
    if (routed === null) {
      return
    }
    if ('event' in routed) {
      told.call(routed.event, routed.inside, [routed.effect])
      return
    }
    const described = describedAt(description, routed.inside)
    const at = propsAt(latest, routed.inside)
    const top = routed.inside.length === 0
    const own = !top && ownValue(described, at, NAMES)
    const before = top && described.value !== null ? at[described.value.prop] : heldAt(held, routed.inside)
    const { id: change, value } = routed.change
    if (top) {
      told.bind(value)
    } else if (own) {
      held = holding(held, routed.inside, value)
      running.update(raw, boundNow)
    }
    told.call('change', routed.inside, [
      value,
      {
        refuse: () => {
          if (top) {
            told.bind(before)
          } else if (own && heldAt(held, routed.inside) === value) {
            held = holding(held, routed.inside, before)
            running.update(raw, boundNow)
          }
          running.page.host.dispatch(out.from, { id: change, type: 'refused' })
        },
      },
    ])
  }

  /**
   * Its props in the widget's names
   * @returns {import('@pterror/interact-core').Given} The props
   */
  const given = () => givenFrom(description, items.read(description, latest).props, held, NAMES)
  const options = hostOptions(props, { id, keyId: String }, () => raw, items.read(description, latest).sources)
  const made = page({ ...options, effect, props: widgetProps(description, given()), widget: description.widget }, live)
  let synced = widgetProps(description, given())

  /** @type {Running} */
  const running = {
    drawn: (within) => {
      if (within !== null) {
        made.drawn(made.host.tree(), within)
      }
    },
    form: () => formValue(description, given()),
    page: made,
    reset: () => {
      told.bind(first)
    },
    sources: options.sources,
    stop: () => {
      made.stop()
    },
    tree: () => made.host.tree(),
    update: (next, value) => {
      raw = next
      boundNow = value
      latest = withBound(description, next, value)
      items.apply()
      const now = widgetProps(description, given())
      if (!same(now, synced)) {
        synced = now
        made.host.setProps(now)
      }
    },
  }
  return running
}

/**
 * The name of a callback prop, by the syntax's convention: Svelte 5's `onchange`, `onactivate`
 * @param {string} event - The event
 * @returns {string} The prop
 */
function callbackProp(event) {
  return `on${event}`
}

/**
 * Calls a callback a component's props give, if they give it
 * @param {Props} props - The outermost component's props
 * @param {string} name - The callback's prop
 * @param {readonly string[]} inside - The component it is for, by the props it is inside
 * @param {readonly unknown[]} args - What it is given
 * @returns {void}
 */
function callIn(props, name, inside, args) {
  const heard = propsAt(props, inside)[name]
  if (isCallback(heard)) {
    heard(...args)
  }
}

/**
 * Whether a prop is a callback
 * @param {unknown} value - The prop
 * @returns {value is (...args: readonly unknown[]) => unknown} Whether it is a function
 */
function isCallback(value) {
  return typeof value === 'function'
}

export { callbackProp, callIn, start }
