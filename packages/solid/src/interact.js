/**
 * Draws any interact core widget's view with Solid, generically: `Interact` is a component over a widget and its
 * props (reactive, delivered as `props` inputs). Each part is drawn once, by identity, with `Dynamic` (so a server
 * renders it and the client hydrates it), its attributes the core's (`attributesOf`) and updated in place when that
 * part's own meaning changes; its contents are a keyed list, so a widget's step reruns only what it changed. The
 * listeners and modality are the core's `page`, which finds each part by its id once it is drawn. Ids are Solid's own
 * (`createUniqueId`), so they match between server and client, unless the app names them.
 */

import { attributesOf, elementFor, identity, itemText, page, partName, same } from '@pterror/interact-core'
import {
  createComponent,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  mapArray,
  mergeProps,
  on,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { Dynamic, isServer } from 'solid-js/web'

/** @import { Key, Naming, Node as Part, PageOptions } from '@pterror/interact-core' */
/** @import { Component, JSX } from 'solid-js' */

/**
 * Which part a replaced part is
 * @typedef {Readonly<{ name: string, item: Key | null }>} PartOf
 */

/**
 * The props a replaced part is given: its attributes (its id among them), which its element takes, its contents, and
 * which part it is
 * @typedef {Readonly<{ [attribute: string]: unknown }> & Readonly<{ children?: JSX.Element, part: PartOf }>} PartProps
 */

/**
 * What the page needs, optionally how an item is drawn (by default its text in its source) and the parts the app draws itself,
 * by name (`option`)
 * @typedef {PageOptions & Readonly<{
 *   item?: ((key: Key) => JSX.Element) | undefined,
 *   parts?: Readonly<{ [name: string]: Component<PartProps> | undefined }> | undefined,
 * }>} InteractProps
 */

/**
 * One part with its contents named, not nested: its own child parts by identity, its text and items as they are
 * @typedef {Readonly<{
 *   node: Part,
 *   content: readonly string[],
 *   values: readonly (Readonly<{ text: string }> | Readonly<{ item: Key, source: string }> | null)[],
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
 * A part's attributes as Solid sets them: `undefined` for one it doesn't have, so an attribute it had goes, and
 * `hidden` as the boolean Solid sets it as
 * @param {ReadonlyMap<string, string | null>} attributes - The attributes
 * @returns {{ [attribute: string]: string | boolean | undefined }} The attributes
 */
function solidAttributes(attributes) {
  /** @type {{ [attribute: string]: string | boolean | undefined }} */
  const set = {}
  for (const [name, value] of attributes) {
    set[name] = name === 'hidden' ? value !== null : (value ?? undefined)
  }
  return set
}

/**
 * A content as it is now
 * @param {JSX.Element | (() => JSX.Element)} content - The content, or what gives it
 * @returns {JSX.Element} It
 */
function resolved(content) {
  return typeof content === 'function' ? content() : content
}

/**
 * The live region before Solid draws it
 * @returns {Element | null} None
 */
function noElement() {
  return null
}

/**
 * A widget, drawn and run by Solid
 * @param {InteractProps} props - The widget, its props, and how the app takes part
 * @returns {JSX.Element} Its root part, and the live region it announces in
 */
function Interact(props) {
  const { sources, translate } = props
  /**
   * An item as the app draws it, or its text in its source
   * @param {Readonly<{ item: Key, source: string }>} content - The item
   * @returns {JSX.Element} What it draws
   */
  const item = (content) => (props.item === undefined ? itemText(content, sources) : props.item(content.item))
  const [live, setLive] = createSignal(noElement())
  const running = page(
    {
      effect: (out, host) => {
        props.effect?.(out, host)
      },
      name: props.name ?? String,
      naming: props.naming ?? { id: createUniqueId(), keyId: String },
      props: untrack(() => props.props),
      widget: props.widget,
      words: props.words ?? {},
      ...(sources === undefined ? {} : { sources }),
      ...(translate === undefined ? {} : { translate }),
    },
    live,
  )
  const { naming } = running
  const [version, setVersion] = createSignal(0)

  /**
   * Listens on every part drawn, once the region beside them is in the document
   * @returns {void}
   */
  const drawn = () => {
    const region = live()
    if (region !== null) {
      running.drawn(running.host.tree(), region)
    }
  }

  if (!isServer) {
    const unwatch = running.host.watch(() => {
      setVersion((last) => last + 1)
      drawn()
    })
    onCleanup(() => {
      unwatch()
      running.stop()
    })
    createRenderEffect(
      on(
        () => props.props,
        (next) => {
          running.host.setProps(next)
        },
        { defer: true },
      ),
    )
  }
  const parts = createMemo(() => {
    version()
    /** @type {Map<string, Flat>} */
    const all = new Map()
    flatten(running.host.tree(), naming, all)
    return all
  })

  /**
   * Draws a part: made once, its attributes updated when it changes, its contents a keyed list
   * @param {string} key - The part's identity
   * @returns {JSX.Element} Its element
   */
  const draw = (key) => {
    const flat = createMemo(() => parts().get(key), undefined, { equals: same })
    const first = untrack(flat)
    if (first === undefined) {
      throw new TypeError(`No part ${key}`)
    }
    const node = () => flat()?.node ?? first.node
    const name = partName(first.node.target)
    const replaced = props.parts?.[name]
    const { implicitRole, tag } = elementFor(first.node.role)
    const attributes = createMemo(
      () => solidAttributes(attributesOf(node(), naming, replaced === undefined ? implicitRole : null)),
      undefined,
      { equals: same },
    )
    const content = createMemo(() => flat()?.content ?? [], undefined, { equals: same })
    /**
     * One of the part's contents
     * @param {string} entry - Which: a part's identity, or a text or item's place
     * @param {() => number} index - Its place
     * @returns {JSX.Element | (() => JSX.Element)} What it draws
     */
    const drawContent = (entry, index) => {
      if (entry.startsWith('part ')) {
        return draw(entry.slice('part '.length))
      }
      const value = () => flat()?.values[index()] ?? null
      return () => {
        const given = value()
        return given === null ? '' : 'text' in given ? given.text : item(given)
      }
    }
    const extra = tag === 'button' && replaced === undefined ? { type: 'button' } : {}
    const children = isServer
      ? () => content().map((entry, index) => drawContent(entry, () => index))
      : mapArray(content, drawContent)
    const rest = {
      /**
       * The part's contents, each text or item as it is now: drawn only once the part is (a server keys a part for
       * hydration as it draws it, before its contents, as the client claims them)
       * @returns {JSX.Element} The contents
       */
      get children() {
        return children().map((child) => resolved(child))
      },
    }
    if (replaced !== undefined) {
      return createComponent(replaced, mergeProps(attributes, rest, { part: { item: first.node.target.item, name } }))
    }
    return createComponent(Dynamic, mergeProps(attributes, rest, extra, { component: tag }))
  }

  const root = draw(identity(untrack(() => running.host.tree()).target, naming))
  onMount(() => {
    drawn()
    running.host.begin()
  })
  return [
    root,
    createComponent(Dynamic, {
      component: 'div',
      ref: (/** @type {Element} */ element) => {
        setLive(element)
      },
      role: 'status',
    }),
  ]
}

export { Interact }
