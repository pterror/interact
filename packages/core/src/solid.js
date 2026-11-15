/**
 * Draws any widget's view with Solid, generically: `Interact` is a component over a widget and its props (reactive,
 * delivered as `props` inputs). Each part is drawn once, by identity, and updated in place: a part's attributes and
 * listeners rerun only when that part's own meaning changed, and its contents are a keyed list, so a widget's step
 * reruns only what it changed. The meaning, listeners and modality are `page`'s, as in the DOM renderer.
 */

import {
  createComputed,
  createMemo,
  createRenderEffect,
  createSignal,
  mapArray,
  on,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { insert } from 'solid-js/web'

import { same } from './compose.js'
import { elementFor, identity, page, partName } from './web.js'

/** @import { Accessor, JSX } from 'solid-js' */
/** @import { Node as Part } from './compose.js' */
/** @import { Key } from './contract.js' */
/** @import { Naming, PageOptions } from './web.js' */

/**
 * An element the app makes for a part, which the part's meaning is applied to, and where its content goes
 * @typedef {Readonly<{ element: Element, slot: Element }>} Made
 */

/**
 * @typedef {PageOptions & Readonly<{
 *   item: (key: Key) => JSX.Element,
 *   parts: Readonly<{ [name: string]: (node: Accessor<Part>) => Made }>,
 * }>} InteractProps
 */

/**
 * One part with its contents named, not nested: its own child parts by identity, its text and items as they are
 * @typedef {Readonly<{
 *   node: Part,
 *   content: readonly string[],
 *   values: readonly (Readonly<{ text: string }> | Readonly<{ item: Key }> | null)[],
 * }>} Flat
 */

/**
 * Every part of a tree, flat, by identity
 * @param {Part} node - The root
 * @param {Naming} naming - The host's naming
 * @param {Map<string, Flat>} into - Where each part goes
 * @returns {string} The root's identity
 */
function flatten(node, naming, into) {
  const key = identity(node.target, naming)
  /** @type {string[]} */
  const content = []
  /** @type {Flat['values'][number][]} */
  const values = []
  for (const [index, child] of node.content.entries()) {
    if ('target' in child) {
      content.push(`part ${flatten(child, naming, into)}`)
      values.push(null)
    } else {
      content.push(`${'text' in child ? 'text' : 'item'} ${String(index)}`)
      values.push(child)
    }
  }
  into.set(key, { content, node: { ...node, content: [] }, values })
  return key
}

/**
 * A widget, drawn and run by Solid
 * @param {InteractProps} props - The widget, its props, and how the app takes part
 * @returns {JSX.Element} Its root part, and the live region it announces in
 */
function Interact(props) {
  const running = page({
    announce: (message) => props.announce(message),
    effect: (out, host) => {
      props.effect(out, host)
    },
    naming: props.naming,
    props: untrack(() => props.props),
    widget: props.widget,
  })
  const { naming } = props
  const [version, setVersion] = createSignal(0)
  const unwatch = running.host.watch(() => {
    setVersion((last) => last + 1)
  })
  onCleanup(() => {
    unwatch()
    running.stop()
  })
  createComputed(
    on(
      () => props.props,
      (next) => {
        running.host.setProps(next)
      },
      { defer: true },
    ),
  )
  const parts = createMemo(() => {
    version()
    /** @type {Map<string, Flat>} */
    const all = new Map()
    flatten(running.host.tree(), naming, all)
    return all
  })

  /**
   * Draws a part: made once, its meaning applied again when it changes, its contents a keyed list
   * @param {string} key - The part's identity
   * @returns {Element} Its element
   */
  const draw = (key) => {
    const flat = createMemo(() => parts().get(key), undefined, { equals: same })
    const first = untrack(flat)
    if (first === undefined) {
      throw new TypeError(`No part ${key}`)
    }
    const node = () => flat()?.node ?? first.node
    const make = props.parts[partName(first.node.target)]
    const made = make === undefined ? defaultElement(first.node) : make(node)
    createRenderEffect(() => {
      running.bind(key, made.element, node())
    })
    onCleanup(() => {
      running.unbind(key)
    })
    const content = createMemo(() => flat()?.content ?? [], undefined, { equals: same })
    insert(
      made.slot,
      mapArray(content, (name, index) => {
        if (name.startsWith('part ')) {
          return draw(name.slice('part '.length))
        }
        const value = () => flat()?.values[index()] ?? null
        return () => {
          const given = value()
          return given === null ? '' : 'text' in given ? given.text : props.item(given.item)
        }
      }),
    )
    return made.element
  }

  const root = draw(identity(untrack(() => running.host.tree()).target, naming))
  onMount(() => {
    running.host.begin()
  })
  return [root, running.live]
}

/**
 * The element for a part the app makes nothing for
 * @param {Part} node - The part
 * @returns {Made} The element, holding its content itself
 */
function defaultElement(node) {
  const element = document.createElement(elementFor(node.role).tag)
  if (element instanceof HTMLButtonElement) {
    element.type = 'button'
  }
  return { element, slot: element }
}

export { Interact }
