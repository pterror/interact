/**
 * What every generated Vue component runs on: a widget described for a component, run by the core's page and drawn by
 * Vue's render functions. Each part is a vnode with the core's attributes (`attributesOf`), so a server renders what
 * the client hydrates; after each update the page listens on every part, found by its id. The bound value follows
 * `v-model` (`modelValue` and `update:modelValue`, or `v-model:open` for a value of another name, with `defaultValue`
 * or `defaultOpen` where the component's own value starts), each of the widget's own effects is an emitted event, an
 * item is drawn by the default slot and a part the app replaces by the slot named after it. Ids come from `useId`
 * (Vue 3.5), or a count kept per app, which a server and its client keep alike.
 */

import {
  attributesOf,
  describedAt,
  elementFor,
  givenFrom,
  heldAt,
  heldFrom,
  formValue,
  holding,
  hostOptions,
  identity,
  inForm,
  itemSources,
  itemsProp,
  itemText,
  ownValue,
  page,
  partName,
  propsAt,
  route,
  same,
  widgetProps,
  prefixedIds,
} from '@pterror/interact-core'
// oxlint-disable-next-line import/no-namespace -- useId is Vue 3.5's; a named import of it fails to link on 3.3 and 3.4
import * as vue from 'vue'

/** @import { Description, Key, Names, Naming, Node as Part, Out, OutsideGiven, Page, Props, Source, Words, Sourced } from '@pterror/interact-core' */
/** @import { Component as VueComponent, VNode, VNodeChild } from 'vue' */

const { getCurrentInstance, h, onBeforeUnmount, onMounted, onUpdated, shallowRef, watch } = vue

/**
 * What a bound value's change event is given beside the value: `refuse` undoes the change, now or later
 * @typedef {Readonly<{ refuse: () => void }>} Change
 */

/**
 * What the slot of a part the app replaces is given: the attributes its element takes (its id among them), which part
 * it is, and its contents, as a component to draw inside it
 * @typedef {Readonly<{
 *   attrs: Readonly<{ [attribute: string]: string }>,
 *   part: Readonly<{ name: string, item: Key | null }>,
 *   content: VueComponent,
 * }>} PartSlot
 */

/**
 * What every component takes beside its widget's props: how an item is named in announcements (`itemName`), the name
 * of its form field (for a value that is a key, held in a hidden input), the sources the widget asks about, the words announcements use, how ids are made, key rebinding, and the elements outside it the widget
 * refers to (its visible `label`), each by id, as an element, or by a ref
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
 * The name Vue's `v-model` gives a bound value's prop
 * @template {string} V
 * @typedef {V extends 'value' ? 'modelValue' : V} ModelName
 */

/**
 * The props of a bound value `V` of type `T`, by `v-model`'s convention, and where the component's own value starts
 * @template {string} V
 * @template T
 * @typedef {{ readonly [K in ModelName<V>]?: T }
 *   & { readonly [K in `default${Capitalize<V>}`]?: T }
 *   & { readonly [K in `onUpdate:${ModelName<V>}`]?: (value: T, change: Change) => void }} Bound
 */

/**
 * A component's own props: the widget's props `P` but its bound value `V` (of type `T`) and the props `I` takes, the
 * bound value's props, a listener for each effect in `E` (given the effect), and `I`, the props of the components
 * inside
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
 * The slots of a component with the parts `Parts`: the default slot draws an item, each part's slot replaces it
 * @template {string} Parts
 * @typedef {{ default?: (props: Readonly<{ item: Key }>) => VNodeChild } & {
 *   [P in Parts]?: (props: PartSlot) => VNodeChild
 * }} Slots
 */

/**
 * The events a component with the bound value `V` (of type `T`) and the effects `E` emits
 * @template {string} V
 * @template T, E
 * @typedef {([V] extends [never] ? unknown : { [K in `update:${ModelName<V>}`]: (value: T, change: Change) => void }) & {
 *   [K in E extends Readonly<{ type: infer N extends string }> ? N : never]: (effect: Extract<E, Readonly<{ type: K }>>) => void
 * }} Emits
 */

/**
 * What a component made around another reads of it: its description, and the types of its own props and parts
 * @typedef {Readonly<{ description: Description, types: Readonly<{ own: unknown, parts: string }> | undefined }>} AnyComponent
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
 * @typedef {HostProps & Props} Given
 */

/**
 * A slot as a component calls it: a method's type, so a slot typed by what it is given is one
 * @typedef {Readonly<{ draw(props: Readonly<{ [field: string]: unknown }>): VNodeChild }>['draw']} SlotLike
 */

/**
 * What a component's setup reads of Vue's context: the app's slots, and emitting an event (a method, so a context
 * typed by the component's own events is one)
 * @typedef {Readonly<{ slots: object }> & Readonly<{
 *   emit(event: string, ...args: readonly unknown[]): void,
 * }>} Context
 */

/**
 * A word with its first letter capital
 * @param {string} word - The word
 * @returns {string} It, capitalised
 */
function capital(word) {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`
}

/**
 * The name `v-model` gives a bound value's prop
 * @param {string} prop - The widget's name for it
 * @returns {string} Vue's
 */
function modelName(prop) {
  return prop === 'value' ? 'modelValue' : prop
}

/** @type {Names} */
const NAMES = { initial: (prop) => `default${capital(prop)}`, value: modelName }

const HOST_PROPS = ['itemName', 'name', 'naming', 'outside', 'sources', 'translate', 'words']

/** @type {WeakMap<object, number>} */
const counted = new WeakMap()

/**
 * An id prefix for a component: Vue's own, or the next in a count its app keeps
 * @returns {string} The prefix
 */
function useIdPrefix() {
  if (typeof vue.useId === 'function') {
    return vue.useId()
  }
  const app = getCurrentInstance()?.appContext ?? counted
  const next = (counted.get(app) ?? 0) + 1
  counted.set(app, next)
  return `v-${String(next)}`
}

/**
 * The live region before Vue draws it
 * @returns {Element | null} None
 */
function noElement() {
  return null
}

/**
 * The form field before Vue draws it
 * @returns {HTMLInputElement | null} None
 */
function noInput() {
  return null
}

/**
 * Whether a value is a callback
 * @param {unknown} value - The value
 * @returns {value is (...args: readonly unknown[]) => unknown} Whether it is a function
 */
function isCallback(value) {
  return typeof value === 'function'
}

/**
 * The attributes of a part, as Vue sets them
 * @param {ReadonlyMap<string, string | null>} attributes - The attributes
 * @returns {{ [attribute: string]: string }} Those it has
 */
function vueAttributes(attributes) {
  /** @type {{ [attribute: string]: string }} */
  const set = {}
  for (const [name, value] of attributes) {
    if (value !== null) {
      set[name] = value
    }
  }
  return set
}

/**
 * Whether a value is a slot
 * @param {unknown} value - The value
 * @returns {value is SlotLike} Whether it is a function
 */
function isSlot(value) {
  return typeof value === 'function'
}

/**
 * The app's slot of a name
 * @param {object} slots - The app's slots
 * @param {string} name - The slot's name
 * @returns {SlotLike | undefined} The slot, if the app gives it
 */
function slotOf(slots, name) {
  /** @type {unknown} */
  const slot = Reflect.get(slots, name)
  return isSlot(slot) ? slot : undefined
}

/**
 * Draws a part and what is in it
 * @param {Part} node - The part
 * @param {Naming} naming - How ids are made
 * @param {Context['slots']} slots - The app's slots
 * @param {Readonly<{ [name: string]: Source }> | undefined} sources - The sources, whose text an item is drawn as when
 *   the default slot doesn't draw it
 * @returns {VNode} The part
 */
function drawPart(node, naming, slots, sources) {
  const children = () =>
    node.content.map((content) => {
      if ('target' in content) {
        return drawPart(content, naming, slots, sources)
      }
      if ('text' in content) {
        return content.text
      }
      const item = slotOf(slots, 'default')
      return item === undefined ? itemText(content, sources) : item({ item: content.item })
    })
  const name = partName(node.target)
  const replaced = slotOf(slots, name)
  const key = identity(node.target)
  if (replaced !== undefined) {
    const attrs = vueAttributes(attributesOf(node, naming, null))
    const content = { render: children }
    return h(vue.Fragment, { key }, [replaced({ attrs, content, part: { item: node.target.item, name } })])
  }
  const { implicitRole, tag } = elementFor(node.role)
  const attrs = vueAttributes(attributesOf(node, naming, implicitRole))
  return h(tag, tag === 'button' ? { ...attrs, key, type: 'button' } : { ...attrs, key }, children())
}

/**
 * The props a component declares: its widget's, its bound value's, those of the components inside, and the host's
 * @param {Description} description - The component's widget
 * @returns {string[]} Their names
 */
function declared(description) {
  const { value } = description
  return [
    ...description.props,
    ...(value === null ? [] : [modelName(value.prop), NAMES.initial(value.prop)]),
    ...Object.keys(description.inside),
    ...description.sources.map((prop) => itemsProp(prop)),
    ...HOST_PROPS,
  ]
}

/**
 * The events a component emits: its bound value's update, and the widget's own events
 * @param {Description} description - The component's widget
 * @returns {string[]} Their names
 */
function emitted(description) {
  const { value } = description
  return [...(value === null ? [] : [`update:${modelName(value.prop)}`]), ...description.events]
}

/**
 * Sets up a component over a widget's description: what its setup does
 * @param {Description} description - The widget, and how the component takes its props
 * @param {Given} props - The component's props
 * @param {Context} context - Its slots and emit
 * @returns {() => VNodeChild} Its render function
 */
function run(description, props, context) {
  const prefix = useIdPrefix()
  const held = shallowRef(heldFrom(description, props, NAMES))
  const version = shallowRef(0)
  const live = shallowRef(noElement())

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
    const at = propsAt(props, routed.inside)
    if ('event' in routed) {
      if (routed.inside.length === 0) {
        context.emit(routed.event, routed.effect)
      } else {
        const heard = at[`on${capital(routed.event)}`]
        if (isCallback(heard)) {
          heard(routed.effect)
        }
      }
      return
    }
    const described = describedAt(description, routed.inside)
    if (described.value === null) {
      return
    }
    const own = ownValue(described, at, NAMES)
    const before = heldAt(held.value, routed.inside)
    const { id: changeId, value } = routed.change
    if (own) {
      held.value = holding(held.value, routed.inside, value)
    }
    /** @type {Change} */
    const change = {
      refuse: () => {
        if (own && heldAt(held.value, routed.inside) === value) {
          held.value = holding(held.value, routed.inside, before)
        }
        running.host.dispatch(out.from, { id: changeId, type: 'refused' })
      },
    }
    const update = `update:${modelName(described.value.prop)}`
    if (routed.inside.length === 0) {
      context.emit(update, value, change)
    } else {
      const heard = at[`on${capital(update)}`]
      if (isCallback(heard)) {
        heard(value, change)
      }
    }
  }

  const items = itemSources()
  const options = hostOptions(props, prefixedIds(prefix), () => props, items.read(description, props).sources)
  const { naming } = options
  const given = () => givenFrom(description, items.read(description, props).props, held.value, NAMES)
  const current = () => widgetProps(description, given())
  /** @type {Page} */
  const running = page({ ...options, effect, props: current(), widget: description.widget }, () => live.value)
  const unwatch = running.host.watch(() => {
    version.value += 1
  })
  const field = shallowRef(noInput())
  const initial = held.value
  /**
   * Gives a value of its own back what it started as, when its form is reset
   * @returns {void}
   */
  const reset = () => {
    if (ownValue(description, props, NAMES)) {
      held.value = initial
    }
  }
  let synced = current()
  watch(current, (now) => {
    items.apply()
    if (!same(now, synced)) {
      synced = now
      running.host.setProps(now)
    }
  })
  onMounted(() => {
    if (live.value !== null) {
      running.drawn(running.host.tree(), live.value)
    }
    running.host.begin()
    field.value?.form?.addEventListener('reset', reset)
  })
  onUpdated(() => {
    if (live.value !== null) {
      running.drawn(running.host.tree(), live.value)
    }
  })
  onBeforeUnmount(() => {
    field.value?.form?.removeEventListener('reset', reset)
    unwatch()
    running.stop()
  })
  return () => {
    void version.value
    const { name } = props
    return [
      drawPart(running.host.tree(), naming, context.slots, options.sources),
      h('div', {
        ref: (/** @type {unknown} */ element) => {
          live.value = element instanceof Element ? element : null
        },
        role: 'status',
      }),
      ...(typeof name === 'string' && inForm(description)
        ? [
            h('input', {
              name,
              ref: (/** @type {unknown} */ element) => {
                field.value = element instanceof HTMLInputElement ? element : null
              },
              type: 'hidden',
              value: formValue(description, given()) ?? '',
            }),
          ]
        : []),
    ]
  }
}

/**
 * The options of a component over a widget's description: its name, the props it declares and the events it emits
 * @param {Description} description - The widget, and how the component takes its props
 * @param {string} name - The component's name, for Vue's tools
 * @returns {Readonly<{ name: string, props: string[], emits: string[] }>} The options
 */
function optionsOf(description, name) {
  return { emits: emitted(description), name, props: declared(description) }
}

/**
 * The types a component carries for a component made around it to read: none at run time
 * @returns {undefined} Nothing
 */
function typesOf() {
  return undefined
}

export { optionsOf, run, typesOf }
