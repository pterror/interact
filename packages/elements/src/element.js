/**
 * What every generated custom element runs on: a widget described for an element, drawn by the core's DOM renderer
 * into the element's shadow root. Each part's element names itself and the states it shows in its `part` attribute
 * (`::part(option selected)`), a part holding the widget's text holds it in a slot named after the part, and the element
 * carries the states of the parts drawn once as custom states (`:state(expanded)`). Each prop is a property, and an
 * attribute (in kebab case) where an attribute can hold it; the bound value is the `value` (or `open`, ...) property
 * and attribute, and a change of it is a cancelable `change` event (cancelling it refuses the change). The widget's
 * other own effects are events of their type. An element made by a factory (the dialog) takes the element inside it as
 * the widget it is around, and that element's props and value as the inner widget's.
 */

import {
  describedAt,
  formValue,
  inForm,
  isRecord,
  itemSources,
  itemsProp,
  outsideElement,
  renderDom,
  route,
  statesOf,
  widgetProps,
  prefixedIds,
} from '@pterror/interact-core'

/** @import { Description, Host, Item, Key, Naming, Node as Part, Out, Source, Words } from '@pterror/interact-core' */

/**
 * What a prop holds, as an attribute can give it
 * @typedef {'string' | 'number' | 'boolean' | 'other'} Kind
 */

/**
 * An element's widget, and how its props are attributes: each prop's kind, and the factory and its other
 * parameters when it is one (each parameter's attribute holds a space-separated list)
 * @typedef {Readonly<{
 *   description: Description | null,
 *   factory: ((inside: Description, ...params: readonly (readonly string[])[]) => Description) | null,
 *   params: readonly string[],
 *   kinds: Readonly<{ [prop: string]: Kind }>,
 * }>} Info
 */

/**
 * An element of a widget whose props are `P`, its bound value `V` of type `T`, and its props in `S` naming a
 * collection: each prop a property, the items of each collection a property in its prop's place (`items`), its form
 * field's name for a value that is a key, and the properties every element takes
 * @template P
 * @template {string} V
 * @template T
 * @template {string} S
 * @typedef {InteractElement & { -readonly [K in Exclude<keyof P, V | S>]: P[K] } & { [K in V]: T } & {
 *   [K in S & keyof P]: P[K]
 * } & ([T] extends [boolean] ? unknown : { name: string }) & {
 *   [K in S as K extends 'source' ? 'items' : `${K}Items`]: readonly Item[] | undefined
 * } & Readonly<{ item?: (key: Key) => string | globalThis.Node }> & {
 *   itemName?: (key: Key) => string,
 *   naming?: Naming,
 *   outside?: Readonly<{ [name: string]: string | Element }>,
 *   sources?: Readonly<{ [name: string]: Source }>,
 *   translate?: (input: Readonly<{ [field: string]: unknown }>) => Readonly<{ [field: string]: unknown }> | null,
 *   words?: Words,
 * }} ElementOf
 */

/** The properties every element takes beside its widget's props */
const HOST = ['item', 'itemName', 'naming', 'outside', 'sources', 'translate', 'words']

let count = 0

/**
 * A prop's name as an attribute: kebab case
 * @param {string} name - The prop
 * @returns {string} The attribute
 */
function attributeOf(name) {
  return name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * An attribute's value as a prop of a kind
 * @param {Kind} kind - The prop's kind
 * @param {string | null} text - The attribute's value
 * @returns {unknown} The prop
 */
function parse(kind, text) {
  if (kind === 'boolean') {
    return text !== null
  }
  if (text === null) {
    return undefined
  }
  return kind === 'number' ? Number(text) : text
}

/**
 * The value a prop of a kind has before one is given
 * @param {Kind} kind - The kind
 * @returns {unknown} Nothing, as the kind has it
 */
function emptyOf(kind) {
  return kind === 'boolean' ? false : kind === 'number' ? 0 : kind === 'string' ? '' : null
}

/**
 * The renderer before the element starts it
 * @returns {Readonly<{ host: Host, stop: () => void }> | null} None
 */
function noRenderer() {
  return null
}

/**
 * An element running one of interact's widgets
 */
class InteractElement extends HTMLElement {
  /** @type {Info} */
  static info = { description: null, factory: null, kinds: {}, params: [] }

  /** Labelable, its `<label>`s the widget's visible label, and a field of its form */
  static formAssociated = true

  /** @type {{ [prop: string]: unknown }} */
  #props = {}

  #running = noRenderer()

  /** @type {Description | null} */
  #described = null

  /** @type {ElementInternals | null} */
  /** @readonly */
  #internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null

  /** @type {InteractElement | null} */
  #owner = null

  /** @readonly */
  #items = itemSources()

  /**
   * The attributes it hears: its widget's props an attribute can hold, its factory's parameters
   * @returns {string[]} Their names
   */
  static get observedAttributes() {
    const { info } = this
    return [
      ...Object.keys(info.kinds)
        .filter((name) => info.kinds[name] !== 'other')
        .map((name) => attributeOf(name)),
      ...info.params.map((name) => attributeOf(name)),
    ]
  }

  /**
   * Its info
   * @returns {Info} What its class was defined with
   */
  get info() {
    const { constructor } = this
    return typeof constructor === 'function' && 'info' in constructor && isInfo(constructor.info)
      ? constructor.info
      : InteractElement.info
  }

  /**
   * A prop's value
   * @param {string} name - The prop
   * @returns {unknown} Its value
   */
  read(name) {
    if (name in this.#props) {
      return this.#props[name]
    }
    const kind = this.info.kinds[name] ?? 'other'
    const parsed = parse(kind, this.getAttribute(attributeOf(name)))
    const bound = this.#described?.value ?? this.info.description?.value
    return parsed !== undefined ? parsed : bound?.prop === name ? bound.empty : emptyOf(kind)
  }

  /**
   * Sets a prop
   * @param {string} name - The prop
   * @param {unknown} value - Its value
   * @returns {void}
   */
  write(name, value) {
    this.#props[name] = value
    this.refresh()
  }

  /**
   * Its props in its widget's names, and those of the element inside, if it is a factory's
   * @returns {Readonly<{ [prop: string]: unknown }>} The props
   */
  given() {
    const described = this.#described
    if (described === null) {
      return {}
    }
    /** @type {{ [prop: string]: unknown }} */
    const given = {}
    for (const name of described.props) {
      given[name] = this.read(name)
    }
    for (const name of described.sources) {
      const items = this.#props[itemsProp(name)]
      if (Array.isArray(items) && !(name in this.#props) && !this.hasAttribute(attributeOf(name))) {
        delete given[name]
        given[itemsProp(name)] = items
      }
    }
    if (described.value !== null) {
      given[described.value.prop] = this.read(described.value.prop)
    }
    const inner = this.#inner()
    for (const name of Object.keys(described.inside)) {
      given[name] = inner?.given() ?? {}
    }
    return given
  }

  /**
   * The element inside it, for a factory's element
   * @returns {InteractElement | null} The element
   */
  #inner() {
    const found = [...this.children].find((child) => child instanceof InteractElement)
    return found instanceof InteractElement ? found : null
  }

  /**
   * Gives the widget its props again
   * @returns {void}
   */
  refresh() {
    if (this.#owner !== null) {
      this.#owner.refresh()
      return
    }
    const described = this.#described
    if (described !== null && this.#running !== null) {
      const { props } = this.#items.read(described, this.given())
      this.#items.apply()
      this.#running.host.setProps(widgetProps(described, props))
      this.#form()
    }
  }

  /**
   * Gives its form its value: the bound value, when it is a key
   * @returns {void}
   */
  #form() {
    const described = this.#described
    if (described !== null && inForm(described)) {
      this.#internals?.setFormValue(formValue(described, this.given()))
    }
  }

  /**
   * Its form was reset: its value is the one its attribute gives, or none
   * @returns {void}
   */
  formResetCallback() {
    const bound = this.#described?.value
    if (bound !== null && bound !== undefined) {
      delete this.#props[bound.prop]
      this.refresh()
    }
  }

  /**
   * The browser restored its form's state: its value
   * @param {unknown} state - The value it gave its form
   * @returns {void}
   */
  formStateRestoreCallback(state) {
    const bound = this.#described?.value
    if (bound !== null && bound !== undefined && typeof state === 'string') {
      this.write(bound.prop, state)
    }
  }

  /**
   * @param {string} name - The attribute
   * @returns {void}
   */
  attributeChangedCallback(name) {
    if (this.info.params.some((param) => attributeOf(param) === name)) {
      return
    }
    this.refresh()
  }

  /** @returns {void} */
  connectedCallback() {
    const { parentElement } = this
    if (parentElement instanceof InteractElement && parentElement.info.factory !== null) {
      this.#owner = parentElement
      this.#described = this.info.description
      return
    }
    this.#start()
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#running?.stop()
    this.#running = null
  }

  /**
   * Starts the widget in the shadow root
   * @returns {void}
   */
  #start() {
    const { info } = this
    const inner = this.#inner()
    if (info.factory !== null && inner !== null) {
      inner.#owner = this
      inner.#described = inner.info.description
    }
    const insideDescription = inner?.info.description ?? null
    this.#described =
      info.factory === null
        ? info.description
        : insideDescription === null
          ? null
          : info.factory(insideDescription, ...info.params.map((param) => this.#param(param)))
    const described = this.#described
    if (described === null) {
      return
    }
    const root = this.shadowRoot ?? this.attachShadow({ delegatesFocus: true, mode: 'open' })
    count += 1
    const naming = this.read('naming')
    const sources = this.read('sources')
    const item = this.read('item')
    const nameOf = this.read('itemName')
    const words = this.read('words')
    const made = this.#items.read(described, this.given())
    const all = isSources(sources) ? { ...sources, ...made.sources } : made.sources
    const [first] = Object.values(made.sources)
    const running = renderDom({
      container: root,
      effect: (out) => {
        this.#heard(out)
      },
      exposeParts: true,
      slotText: true,
      naming: isNaming(naming) ? naming : prefixedIds(`${this.localName}-${String(count)}`),
      outside: (name) => this.#outside(name),
      props: widgetProps(described, made.props),
      sources: all,
      widget: described.widget,
      ...(isItem(item) ? { item } : {}),
      ...(isNameOf(nameOf) ? { name: nameOf } : first === undefined ? {} : { name: first.text }),
      ...(isWords(words) ? { words } : {}),
    })
    this.#running = running
    this.#states(running.host.tree())
    this.#form()
    running.host.watch(() => {
      this.#states(running.host.tree())
    })
  }

  /**
   * An element outside it its widget refers to: one its `outside` property gives (by id, in the document it is in), or
   * for its `label`, its first `<label>`
   * @param {string} name - The name the widget gives it
   * @returns {Element | null} The element
   */
  #outside(name) {
    const given = this.read('outside')
    const one = isRecord(given) ? given[name] : undefined
    const root = this.getRootNode()
    if (typeof one === 'string') {
      // oxlint-disable-next-line unicorn/prefer-query-selector -- an app's id need not be a CSS identifier
      return root instanceof Document || root instanceof ShadowRoot ? root.getElementById(one) : null
    }
    const label = name === 'label' ? this.#internals?.labels[0] : undefined
    return outsideElement(isRecord(given) ? given : {}, name) ?? (label instanceof Element ? label : null)
  }

  /**
   * A factory parameter, from its attribute: a space-separated list
   * @param {string} name - The parameter
   * @returns {readonly string[]} Its value
   */
  #param(name) {
    return (this.getAttribute(attributeOf(name)) ?? '').split(/\s+/u).filter((one) => one !== '')
  }

  /**
   * Shows the states of the parts drawn once as custom states
   * @param {Part} tree - The parts
   * @returns {void}
   */
  #states(tree) {
    const states = this.#internals?.states
    if (states === undefined) {
      return
    }
    /** @type {Set<string>} */
    const now = new Set()
    /** @type {Part[]} */
    const parts = [tree]
    for (let node = parts.pop(); node !== undefined; node = parts.pop()) {
      if (node.target.item === null) {
        for (const state of statesOf(node)) {
          now.add(state)
        }
      }
      for (const content of node.content) {
        if ('target' in content) {
          parts.push(content)
        }
      }
    }
    for (const state of states) {
      if (!now.has(state)) {
        states.delete(state)
      }
    }
    for (const state of now) {
      states.add(state)
    }
  }

  /**
   * Hears an effect the widget gives the app: a change is the bound value's `change` event, on the element it is for;
   * any other is an event of its type
   * @param {Out} out - The effect
   * @returns {void}
   */
  #heard(out) {
    const described = this.#described
    const routed = described === null ? null : route(described, out)
    if (described === null || routed === null) {
      return
    }
    const target = routed.inside.length === 0 ? this : (this.#inner() ?? this)
    if ('event' in routed) {
      target.dispatchEvent(new CustomEvent(routed.event, { bubbles: true, detail: routed.effect }))
      return
    }
    const bound = describedAt(described, routed.inside).value
    if (bound === null) {
      return
    }
    const before = target.read(bound.prop)
    const { id, value } = routed.change
    const refuse = () => {
      target.#props[bound.prop] = before
      this.#running?.host.dispatch(out.from, { id, type: 'refused' })
      this.refresh()
    }
    target.#props[bound.prop] = value
    if (bound.kind === 'boolean') {
      target.toggleAttribute(attributeOf(bound.prop), value === true)
    }
    const event = new CustomEvent('change', { bubbles: true, cancelable: true, detail: { refuse, value } })
    if (target.dispatchEvent(event)) {
      this.refresh()
    } else {
      refuse()
    }
  }
}

/**
 * Whether a value is an element's info
 * @param {unknown} value - The value
 * @returns {value is Info} Whether it is a record with kinds
 */
function isInfo(value) {
  return isRecord(value) && 'kinds' in value
}

/**
 * Whether a value is a naming
 * @param {unknown} value - The value
 * @returns {value is Naming} Whether it supplies a resolver or prefix-and-key naming
 */
function isNaming(value) {
  return (
    isRecord(value) &&
    (typeof value['idOf'] === 'function' || (typeof value['id'] === 'string' && typeof value['keyId'] === 'function'))
  )
}

/**
 * Whether a value is the sources a widget asks about
 * @param {unknown} value - The value
 * @returns {value is Readonly<{ [name: string]: Source }>} Whether it is a record of them
 */
function isSources(value) {
  return (
    isRecord(value) && Object.values(value).every((source) => isRecord(source) && typeof source['read'] === 'function')
  )
}

/**
 * Whether a value is the words announcements use
 * @param {unknown} value - The value
 * @returns {value is Readonly<{ [message: string]: (values: Readonly<{ [field: string]: unknown }>, name: (key: Key) => string) => string }>}
 *   Whether it is a record of functions
 */
function isWords(value) {
  return isRecord(value) && Object.values(value).every((one) => typeof one === 'function')
}

/**
 * Whether a value draws an item
 * @param {unknown} value - The value
 * @returns {value is (key: Key) => string | globalThis.Node} Whether it is a function
 */
function isItem(value) {
  return typeof value === 'function'
}

/**
 * Whether a value names an item
 * @param {unknown} value - The value
 * @returns {value is (key: Key) => string} Whether it is a function
 */
function isNameOf(value) {
  return typeof value === 'function'
}

/**
 * Defines an element class for a widget; registering its tag is the app's (`register`)
 * @param {Info} info - The widget, and how its props are attributes
 * @returns {typeof InteractElement} The class
 */
function define(info) {
  const element = class extends InteractElement {
    /** @override */
    static info = info
  }
  const names = [
    ...new Set([
      ...(info.description?.sources ?? []).map((prop) => itemsProp(prop)),
      ...Object.keys(info.kinds),
      ...(info.description?.value === null || info.description === null ? [] : [info.description.value.prop]),
      ...HOST,
    ]),
  ]
  for (const name of names) {
    Object.defineProperty(element.prototype, name, {
      configurable: true,
      get() {
        return this instanceof InteractElement ? this.read(name) : undefined
      },
      set(value) {
        if (this instanceof InteractElement) {
          this.write(name, value)
        }
      },
    })
  }
  if (info.description !== null && inForm(info.description)) {
    Object.defineProperty(element.prototype, 'name', {
      configurable: true,
      get() {
        return this instanceof HTMLElement ? (this.getAttribute('name') ?? '') : ''
      },
      set(value) {
        if (this instanceof HTMLElement) {
          this.setAttribute('name', String(value))
        }
      },
    })
  }
  return element
}

export { define, InteractElement }
