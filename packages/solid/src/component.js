/**
 * What every generated Solid component runs on: a widget described for a component, drawn by `Interact`. The bound
 * value follows the convention Solid's libraries share (`value`, `defaultValue`, `onChange`; for a value of another
 * name, `open`, `defaultOpen`, `onOpenChange`), each of the widget's own effects is an `on` prop, and ids come from
 * `createUniqueId`.
 */

import {
  describedAt,
  givenFrom,
  heldAt,
  heldFrom,
  formValue,
  holding,
  hostOptions,
  inForm,
  itemSources,
  ownValue,
  propsAt,
  route,
  same,
  widgetProps,
} from '@pterror/interact-core'
import {
  createComponent,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { Interact } from './interact.js'

/** @import { Description, Host, Key, Names, Naming, Out, OutsideGiven, Props, Source, Words, Sourced } from '@pterror/interact-core' */
/** @import { Component as SolidComponent, JSX } from 'solid-js' */
/** @import { PartProps } from './interact.js' */

/**
 * What a bound value's change callback is given beside the value: `refuse` undoes the change, now or later
 * @typedef {Readonly<{ refuse: () => void }>} Change
 */

/**
 * What every component takes beside its widget's props: how an item is drawn (by default its text in its source) and
 * named in announcements (`itemName`), the name of its form field (for a value that is a key, held in a hidden input),
 * the parts the app draws itself, the sources the widget asks about, the words announcements
 * use, how ids are made (by default from `createUniqueId`), key rebinding, and the elements outside it the widget
 * refers to (its visible `label`), each by id, as an element, or by a function giving it
 * @template {string} Parts
 * @typedef {Readonly<{
 *   item?: (key: Key) => JSX.Element,
 *   itemName?: (key: Key) => string,
 *   name?: string,
 *   parts?: Readonly<{ [P in Parts]?: SolidComponent<PartProps> }>,
 *   sources?: Readonly<{ [name: string]: Source }>,
 *   words?: Words,
 *   naming?: Naming,
 *   translate?: (input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null,
 *   outside?: Readonly<{ [name: string]: OutsideGiven }>,
 * }>} HostProps
 */

/**
 * The props of a bound value `V` of type `T`
 * @template {string} V
 * @template T
 * @typedef {{ readonly [K in V]?: T }
 *   & { readonly [K in `default${Capitalize<V>}`]?: T }
 *   & { readonly [K in V extends 'value' ? 'onChange' : `on${Capitalize<V>}Change`]?: (value: T, change: Change) => void }} Bound
 */

/**
 * A component's own props: the widget's props `P` but its bound value `V` (of type `T`) and the props `I` takes, the
 * bound value's props, an `on` prop for each effect in `E` (given the effect), and `I`, the props of the components
 * inside; each prop in `S` names a collection, which the component can take the items of instead
 * @template P
 * @template {string} V
 * @template T, E, I
 * @template {string} [S=never]
 * @typedef {Sourced<Omit<P, V | keyof I>, S> & ([V] extends [never] ? unknown : Bound<V, T>) & {
 *   readonly [K in E extends Readonly<{ type: infer N extends string }> ? N : never as `on${Capitalize<K>}`]?:
 *     (effect: Extract<E, Readonly<{ type: K }>>) => void
 * } & I} Own
 */

/**
 * A generated component: a Solid component of its own props and the host props, with the description a component made
 * around it (a dialog's content) reads
 * @template O
 * @template {string} Parts
 * @typedef {SolidComponent<O & HostProps<Parts>> & Readonly<{
 *   description: Description,
 *   types?: Readonly<{ own: O, parts: Parts }>,
 * }>} Component
 */

/**
 * What a component made around another reads of it
 * @typedef {Readonly<{ description: Description, types?: Readonly<{ own: unknown, parts: string }> }>} AnyComponent
 */

/**
 * The own props of a component
 * @template {AnyComponent} C
 * @typedef {NonNullable<C['types']>['own']} OwnOf
 */

/**
 * The part names of a component inside another, given by the prop `Inside`: its root takes that prop's name
 * @template {AnyComponent} C
 * @template {string} Inside
 * @typedef {Exclude<NonNullable<C['types']>['parts'], 'root'> | Inside} PartsInside
 */

/**
 * A component's props, as it reads them
 * @typedef {HostProps<string> & Props} Given
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
 * Whether a prop is a callback
 * @param {unknown} value - The prop
 * @returns {value is (...args: readonly unknown[]) => unknown} Whether it is a function
 */
function isCallback(value) {
  return typeof value === 'function'
}

/**
 * Makes a component from a widget's description
 * @template O
 * @template {string} Parts
 * @param {Description} description - The widget, and how the component takes its props
 * @returns {Component<O, Parts>} The component
 */
function component(description) {
  /**
   * The component
   * @param {Given} props - Its props
   * @returns {JSX.Element} The widget, drawn
   */
  const Generated = (props) => {
    const [held, setHeld] = createSignal(untrack(() => heldFrom(description, props, NAMES)))
    const items = itemSources()
    const given = () => givenFrom(description, items.read(description, props).props, held(), NAMES)
    const widget = createMemo(() => widgetProps(description, given()), undefined, { equals: same })
    createEffect(() => {
      items.read(description, props)
      items.apply()
    })
    const initial = untrack(held)

    /**
     * Hears an effect the widget gives the app
     * @param {Out} out - The effect
     * @param {Host} host - The running widget
     * @returns {void}
     */
    const effect = (out, host) => {
      const routed = route(description, out)
      if (routed === null) {
        return
      }
      const at = propsAt(props, routed.inside)
      if ('event' in routed) {
        const heard = at[`on${capital(routed.event)}`]
        if (isCallback(heard)) {
          heard(routed.effect)
        }
        return
      }
      const described = describedAt(description, routed.inside)
      if (described.value === null) {
        return
      }
      const own = ownValue(described, at, NAMES)
      const before = heldAt(held(), routed.inside)
      const { id, value } = routed.change
      if (own) {
        setHeld((now) => holding(now, routed.inside, value))
      }
      const { prop } = described.value
      const heard = at[prop === 'value' ? 'onChange' : `on${capital(prop)}Change`]
      if (isCallback(heard)) {
        heard(value, {
          refuse: () => {
            if (own && heldAt(held(), routed.inside) === value) {
              setHeld((now) => holding(now, routed.inside, before))
            }
            host.dispatch(out.from, { id, type: 'refused' })
          },
        })
      }
    }

    const options = hostOptions(
      props,
      { id: createUniqueId(), keyId: String },
      () => props,
      untrack(() => items.read(description, props).sources),
    )
    const drawn = createComponent(Interact, {
      ...options,
      effect,
      get item() {
        return props.item
      },
      get parts() {
        return props.parts
      },
      get props() {
        return widget()
      },
      widget: description.widget,
    })
    if (!inForm(description) || typeof untrack(() => props.name) !== 'string') {
      return drawn
    }
    /**
     * Gives a value of its own back what it started as, when its form is reset
     * @returns {void}
     */
    const reset = () => {
      if (ownValue(description, props, NAMES)) {
        setHeld(initial)
      }
    }
    const field = createComponent(Dynamic, {
      component: 'input',
      get name() {
        return props.name
      },
      ref: (/** @type {HTMLInputElement} */ input) => {
        onMount(() => {
          const { form } = input
          form?.addEventListener('reset', reset)
          onCleanup(() => {
            form?.removeEventListener('reset', reset)
          })
        })
      },
      type: 'hidden',
      get value() {
        return formValue(description, given()) ?? ''
      },
    })
    return [drawn, field]
  }
  return Object.assign(Generated, { description })
}

export { component }
