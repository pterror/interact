/**
 * What every generated React component runs on: a widget described for a component, run by the core's page and drawn
 * by React. Each part is a React element with the core's attributes (`attributesOf`), so a server renders what the
 * client hydrates; after each commit the page listens on every part, found by its id. The bound value follows React's
 * convention (`value`, `defaultValue`, `onChange`; for a value of another name, `open`, `defaultOpen`, `onOpenChange`),
 * each of the widget's own effects is an `on` prop, and ids come from `useId`.
 */

import {
  attributesOf,
  describedAt,
  elementFor,
  givenFrom,
  heldAt,
  heldFrom,
  holding,
  identity,
  itemText,
  ownValue,
  page,
  partName,
  propsAt,
  route,
  same,
  widgetProps,
} from '@pterror/interact-core'
import { createElement, Fragment, memo, useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react'

/** @import { Description, Held, Key, Names, Naming, Node as Part, Out, Page, Props, Source, Words } from '@pterror/interact-core' */
/** @import { FunctionComponent, ReactElement, ReactNode } from 'react' */

/**
 * What a bound value's change callback is given beside the value: `refuse` undoes the change, now or later
 * @typedef {Readonly<{ refuse: () => void }>} Change
 */

/**
 * Which part a replaced part is
 * @typedef {Readonly<{ name: string, item: Key | null }>} PartOf
 */

/**
 * The props a replaced part is given: its attributes as React props, its contents, and which part it is. The element
 * it draws takes the attributes, its id among them
 * @typedef {Readonly<{ [attribute: string]: unknown }> & Readonly<{ children?: ReactNode, part: PartOf }>} PartProps
 */

/**
 * What every component takes beside its widget's props: how an item is drawn (by default its text in its source) and named in
 * announcements, the parts the app draws itself, the sources the widget asks about, the words announcements use, how
 * ids are made (by default from `useId`), and key rebinding
 * @template {string} Parts
 * @typedef {Readonly<{
 *   item?: (key: Key) => ReactNode,
 *   name?: (key: Key) => string,
 *   parts?: Readonly<{ [P in Parts]?: FunctionComponent<PartProps> }>,
 *   sources?: Readonly<{ [name: string]: Source }>,
 *   words?: Words,
 *   naming?: Naming,
 *   translate?: (input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null,
 * }>} HostProps
 */

/**
 * The props of a bound value `V` of type `T`, by React's convention
 * @template {string} V
 * @template T
 * @typedef {{ readonly [K in V]?: T }
 *   & { readonly [K in `default${Capitalize<V>}`]?: T }
 *   & { readonly [K in V extends 'value' ? 'onChange' : `on${Capitalize<V>}Change`]?: (value: T, change: Change) => void }} Bound
 */

/**
 * A component's own props: the widget's props `P` but its bound value `V` (of type `T`) and the props `I` takes, the
 * bound value's props, an `on` prop for each effect in `E` (given the effect), and `I`, the props of the components
 * inside
 * @template P
 * @template {string} V
 * @template T, E, I
 * @typedef {Omit<P, V | keyof I> & ([V] extends [never] ? unknown : Bound<V, T>) & {
 *   readonly [K in E extends Readonly<{ type: infer N extends string }> ? N : never as `on${Capitalize<K>}`]?:
 *     (effect: Extract<E, Readonly<{ type: K }>>) => void
 * } & I} Own
 */

/**
 * A generated component: a React component of its own props and the host props, with the description a component
 * made around it (a dialog's content) reads
 * @template O
 * @template {string} Parts
 * @typedef {FunctionComponent<O & HostProps<Parts>> & Readonly<{
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
 * How a component draws its parts: the same for every part it draws. An item the app draws no way is its text in its
 * source
 * @typedef {Readonly<{
 *   naming: Naming,
 *   item: ((key: Key) => ReactNode) | undefined,
 *   sources: Readonly<{ [name: string]: Source }> | undefined,
 *   parts: Readonly<{ [name: string]: FunctionComponent<PartProps> | undefined }>,
 * }>} Drawing
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

/** @type {Drawing['parts']} */
const NO_PARTS = {}

const useCommitted = typeof document === 'undefined' ? useEffect : useLayoutEffect

/**
 * The page a component holds before it starts one
 * @returns {Page | null} None
 */
function noPage() {
  return null
}

/**
 * The live region before React draws it
 * @returns {HTMLDivElement | null} None
 */
function noElement() {
  return null
}

/**
 * How parts were drawn before the first drawing
 * @returns {Drawing | null} Not at all
 */
function noDrawing() {
  return null
}

/**
 * Whether a prop is a callback
 * @param {unknown} value - The prop
 * @returns {value is (...args: readonly unknown[]) => unknown} Whether it is a function
 */
function isCallback(value) {
  return typeof value === 'function'
}

/**
 * The prop that hears a bound value change
 * @param {string} prop - The bound value's prop
 * @returns {string} Its callback's prop
 */
function changeProp(prop) {
  return prop === 'value' ? 'onChange' : `on${capital(prop)}Change`
}

/**
 * A part's attributes as React props
 * @param {ReadonlyMap<string, string | null>} attributes - The attributes
 * @returns {{ [prop: string]: unknown }} The props
 */
function reactProps(attributes) {
  /** @type {{ [prop: string]: unknown }} */
  const props = {}
  for (const [name, value] of attributes) {
    if (value === null) {
      continue
    }
    if (name === 'tabindex') {
      props['tabIndex'] = Number(value)
    } else {
      props[name] = name === 'hidden' || value
    }
  }
  return props
}

/**
 * One part and what is in it
 * @param {Readonly<{ node: Part, drawing: Drawing }>} props - The part, and how parts are drawn
 * @returns {ReactElement} The part
 */
function DrawPart({ drawing, node }) {
  const children = node.content.map((content, index) => {
    if ('target' in content) {
      return createElement(PartElement, { drawing, key: identity(content.target, drawing.naming), node: content })
    }
    if ('text' in content) {
      return content.text
    }
    const drawn = drawing.item === undefined ? itemText(content, drawing.sources) : drawing.item(content.item)
    return createElement(Fragment, { key: `item ${String(index)}` }, drawn)
  })
  const name = partName(node.target)
  const replaced = drawing.parts[name]
  if (replaced !== undefined) {
    const props = reactProps(attributesOf(node, drawing.naming, null))
    return createElement(replaced, { ...props, part: { item: node.target.item, name } }, ...children)
  }
  const { implicitRole, tag } = elementFor(node.role)
  const props = reactProps(attributesOf(node, drawing.naming, implicitRole))
  return createElement(tag, tag === 'button' ? { ...props, type: 'button' } : props, ...children)
}

const PartElement = memo(DrawPart, (before, after) => before.drawing === after.drawing && same(before.node, after.node))

/**
 * Starts a widget for a component
 * @param {Description} description - The component's widget
 * @param {Given} props - Its props
 * @param {Held} held - What it holds
 * @param {Naming} naming - How ids are made
 * @param {(out: Out) => void} effect - What hears the app's effects
 * @param {() => Element | null} live - Its live region
 * @returns {Page} The running widget
 */
function start(description, props, held, naming, effect, live) {
  const { name, sources, translate, words } = props
  return page(
    {
      effect,
      naming,
      props: widgetProps(description, givenFrom(description, props, held, NAMES)),
      widget: description.widget,
      ...(name === undefined ? {} : { name }),
      ...(sources === undefined ? {} : { sources }),
      ...(translate === undefined ? {} : { translate }),
      ...(words === undefined ? {} : { words }),
    },
    live,
  )
}

/**
 * How parts are drawn, the same object while what it is made of is the same
 * @param {Naming} naming - How ids are made
 * @param {Given} props - The component's props
 * @returns {Drawing} How parts are drawn
 */
function useDrawing(naming, props) {
  const { item, sources } = props
  const parts = props.parts ?? NO_PARTS
  const last = useRef(noDrawing())
  const kept = last.current
  if (
    kept !== null &&
    kept.item === item &&
    kept.sources === sources &&
    kept.parts === parts &&
    same(kept.naming, naming)
  ) {
    return kept
  }
  const drawing = { item, naming, parts, sources }
  last.current = drawing
  return drawing
}

/**
 * Makes a component from a widget's description
 * @template O
 * @template {string} Parts
 * @param {Description} description - The widget, and how the component takes its props
 * @param {string} displayName - The component's name, for React's tools
 * @returns {Component<O, Parts>} The component
 */
function component(description, displayName) {
  /**
   * The component
   * @param {Given} props - Its props
   * @returns {ReactElement} The widget, drawn
   */
  const Generated = (props) => {
    const id = useId()
    const [held, setHeld] = useState(() => heldFrom(description, props, NAMES))
    const latest = useRef(props)
    latest.current = props
    const heldNow = useRef(held)
    heldNow.current = held
    const live = useRef(noElement())
    const root = useRef(noPage())
    const [, redraw] = useReducer((count) => count + 1, 0)
    const naming = props.naming ?? { id, keyId: String }

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
      const at = propsAt(latest.current, routed.inside)
      if ('event' in routed) {
        const heard = at[`on${capital(routed.event)}`]
        if (isCallback(heard)) {
          heard(routed.effect)
        }
        return
      }
      const described = describedAt(description, routed.inside)
      const own = ownValue(described, at, NAMES)
      const before = heldAt(heldNow.current, routed.inside)
      const { id: change, value } = routed.change
      if (own) {
        setHeld((now) => holding(now, routed.inside, value))
      }
      const heard = described.value === null ? undefined : at[changeProp(described.value.prop)]
      if (isCallback(heard)) {
        heard(value, {
          refuse: () => {
            if (own && heldAt(heldNow.current, routed.inside) === value) {
              setHeld((now) => holding(now, routed.inside, before))
            }
            root.current?.host.dispatch(out.from, { id: change, type: 'refused' })
          },
        })
      }
    }

    root.current ??= start(description, props, held, naming, effect, () => live.current)
    const tree = root.current.host.tree()
    const synced = useRef(widgetProps(description, givenFrom(description, props, held, NAMES)))

    useEffect(() => {
      const made =
        root.current ?? start(description, latest.current, heldNow.current, naming, effect, () => live.current)
      root.current = made
      const unwatch = made.host.watch(redraw)
      if (live.current !== null) {
        made.drawn(made.host.tree(), live.current)
      }
      made.host.begin()
      return () => {
        unwatch()
        made.stop()
        root.current = null
      }
    }, [])

    useCommitted(() => {
      const made = root.current
      if (made === null) {
        return
      }
      const now = widgetProps(description, givenFrom(description, props, held, NAMES))
      if (!same(now, synced.current)) {
        synced.current = now
        made.host.setProps(now)
      }
      if (live.current !== null) {
        made.drawn(made.host.tree(), live.current)
      }
    })

    const drawing = useDrawing(naming, props)
    return createElement(
      Fragment,
      null,
      createElement(PartElement, { drawing, node: tree }),
      createElement('div', { ref: live, role: 'status' }),
    )
  }
  Generated.displayName = displayName
  return Object.assign(Generated, { description })
}

export { component }
