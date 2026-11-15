/**
 * What a part means, in the DOM's words, and DOM events as the contract's inputs: shared by the DOM and Solid
 * renderers. ARIA states become `aria-*` attributes as they are (a reference becomes the referenced part's id), `data`
 * becomes `data-*`, and `tabindex` and `hidden` are HTML's. Events pass through by name and value: an event goes to
 * the innermost part listening for it, and a pointer event to the part under the pointer, the pressed element
 * capturing the pointer so its release is never missed. `aria-modal` is carried out here: while a modal part is shown,
 * everything outside it is inert, and focus goes back where it was when it closes.
 */

import { host as run } from './host.js'

/** @import { AnyWidget, Node, Out, Target } from './compose.js' */
/** @import { Data, Key } from './contract.js' */
/** @import { Host } from './host.js' */

/**
 * How a host names things in the DOM: the prefix of every id, and a key as text for ids
 * @typedef {Readonly<{ id: string, keyId: (key: Key) => string }>} Naming
 */

/**
 * A part's identity among every part drawn
 * @param {Target} target - The part
 * @param {Naming} naming - How the host names keys
 * @returns {string} Its identity
 */
function identity(target, naming) {
  const name = [...target.owner, target.part].join('-')
  return target.item === null ? name : `${name}-${naming.keyId(target.item)}`
}

/**
 * A part's id in the document
 * @param {Target} target - The part
 * @param {Naming} naming - The host's naming
 * @returns {string} The id
 */
function idOf(target, naming) {
  return `${naming.id}-${identity(target, naming)}`
}

/**
 * Whether a resolved ARIA value is a target
 * @param {unknown} value - The value
 * @returns {value is Target} Whether it is one
 */
function isTarget(value) {
  return typeof value === 'object' && value !== null && 'owner' in value && 'part' in value
}

/**
 * The attributes a part has in the DOM, `null` for one it doesn't have
 * @param {Node} node - The part
 * @param {Naming} naming - The host's naming
 * @param {string | null} implicitRole - The role the element has without one (a `button`'s), left out
 * @returns {ReadonlyMap<string, string | null>} Each attribute and its value
 */
function attributesOf(node, naming, implicitRole) {
  /** @type {Map<string, string | null>} */
  const attributes = new Map([
    ['id', idOf(node.target, naming)],
    ['role', node.role === implicitRole ? null : node.role],
    ['tabindex', node.tabindex === null ? null : String(node.tabindex)],
    ['hidden', node.hidden ? '' : null],
  ])
  for (const [name, value] of Object.entries(node.aria)) {
    attributes.set(`aria-${name}`, ariaText(value, naming))
  }
  for (const [name, value] of Object.entries(node.data)) {
    attributes.set(`data-${name}`, value === true ? '' : value === false || value === null ? null : value)
  }
  return attributes
}

/**
 * An ARIA value as attribute text
 * @param {Node['aria'][string]} value - The value
 * @param {Naming} naming - The host's naming
 * @returns {string | null} The text, or `null` to leave the attribute out
 */
function ariaText(value, naming) {
  if (value === null) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (isTarget(value)) {
    return idOf(value, naming)
  }
  return value.map((one) => idOf(one, naming)).join(' ')
}

/**
 * The element a part is drawn as, when the app gives none: a `button` for a button (its activation, Enter and Space
 * clicking it, is HTML's), else a `div`
 * @param {string | null} role - The part's role
 * @returns {Readonly<{ tag: string, implicitRole: string | null }>} The tag, and the role it has without one
 */
function elementFor(role) {
  return role === 'button' ? { implicitRole: 'button', tag: 'button' } : { implicitRole: null, tag: 'div' }
}

/**
 * A DOM event as the contract's input, on a part
 * @param {Event} event - The event
 * @param {Target} target - The part it happened on
 * @returns {Readonly<{ [field: string]: unknown }>} The input
 */
function inputOf(event, target) {
  const base = { item: target.item, part: target.part, timeStamp: event.timeStamp, type: event.type }
  if (event instanceof KeyboardEvent) {
    return { ...base, ...modifiers(event), key: event.key }
  }
  if (event instanceof PointerEvent) {
    return { ...base, button: event.button, clientX: event.clientX, clientY: event.clientY, pointerId: event.pointerId }
  }
  if (event instanceof MouseEvent) {
    return { ...base, ...modifiers(event), button: event.button }
  }
  return base
}

/**
 * An event's modifier keys
 * @param {KeyboardEvent | MouseEvent} event - The event
 * @returns {Readonly<{ altKey: boolean, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean }>} Which are held
 */
function modifiers(event) {
  return { altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey }
}

/**
 * The part a `focus` or `reveal` effect names
 * @param {Out} out - The effect, with the widget it came from
 * @returns {Target | null} The part, or `null` if the effect names none
 */
function effectTarget(out) {
  const { effect, from } = out
  if (typeof effect !== 'object' || effect === null || !('part' in effect) || !Array.isArray(effect.part)) {
    return null
  }
  const path = effect.part.map(String)
  const part = path.at(-1)
  const item =
    'item' in effect && (typeof effect.item === 'string' || typeof effect.item === 'number') ? effect.item : null
  return part === undefined ? null : { item, owner: [...from, ...path.slice(0, -1)], part }
}

/**
 * An effect's type
 * @param {Out} out - The effect
 * @returns {string} Its type
 */
function effectType(out) {
  const { effect } = out
  return typeof effect === 'object' && effect !== null && 'type' in effect ? String(effect.type) : ''
}

/**
 * The part's name as the app names it to replace it: its owner's path and its name, joined by dots (`list.option`)
 * @param {Target} target - The part
 * @returns {string} The name
 */
function partName(target) {
  return [...target.owner, target.part].join('.')
}

/**
 * What the page needs from the app: the widget and its props, how ids are made, how an announcement is worded, and
 * what carries out the app's effects
 * @typedef {Readonly<{
 *   widget: AnyWidget,
 *   props: unknown,
 *   naming: Naming,
 *   announce: (message: Readonly<{ [field: string]: Data }>) => string,
 *   effect: (out: Out, host: Host) => void,
 * }>} PageOptions
 */

/**
 * A widget running in a page: `bind` gives an element a part's meaning and listeners (again on each change),
 * `unbind` lets go of a part no longer drawn; `live` is where announcements are said
 * @typedef {Readonly<{
 *   host: Host,
 *   live: Element,
 *   bind: (key: string, element: Element, node: Node) => void,
 *   unbind: (key: string) => void,
 *   stop: () => void,
 * }>} Page
 */

/**
 * Runs a widget in a page
 * @param {PageOptions} options - The widget and how the app takes part
 * @returns {Page} The running widget, for a renderer to draw
 */
function page(options) {
  const { naming } = options
  /** @type {Map<string, Element>} */
  const elements = new Map()
  /** @type {WeakMap<Element, Node>} */
  const nodes = new WeakMap()
  /** @type {WeakMap<Element, ReadonlySet<string>>} */
  const applied = new WeakMap()
  /** @type {WeakMap<Element, Set<string>>} */
  const listening = new WeakMap()
  /** @type {WeakSet<Event>} */
  const handled = new WeakSet()
  /** @type {Map<string, Readonly<{ restore: Element | null, inert: readonly Element[] }>>} */
  const modals = new Map()
  const live = document.createElement('div')
  live.setAttribute('role', 'status')

  /**
   * Carries out the effects the DOM has a way to: focus, reveal, announce. The rest are the app's
   * @param {Out} out - The effect
   * @param {Host} running - The running widget
   * @returns {void}
   */
  const effect = (out, running) => {
    const type = effectType(out)
    if (type === 'preventDefault') {
      return
    }
    if (type === 'focus' || type === 'reveal') {
      const target = effectTarget(out)
      const element = target === null ? undefined : elements.get(identity(target, naming))
      if (element instanceof HTMLElement && type === 'focus') {
        element.focus()
      } else if (element !== undefined) {
        element.scrollIntoView({ block: 'nearest' })
      }
      return
    }
    const { effect: made } = out
    if (type === 'announce' && typeof made === 'object' && made !== null && 'message' in made) {
      const { message } = made
      if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
        live.textContent = options.announce(Object.fromEntries(Object.entries(message)))
      }
      return
    }
    options.effect(out, running)
  }

  const host = run({ effect, props: options.props, widget: options.widget })

  /**
   * The part an event is for: the part listening, or for a pointer event after the press, the innermost part under
   * the pointer that takes it
   * @param {Event} event - The event
   * @param {Node} node - The part whose listener heard it
   * @returns {Node} The part
   */
  const targetOf = (event, node) => {
    if (!(event instanceof PointerEvent) || event.type === 'pointerdown') {
      return node
    }
    for (
      let under = document.elementFromPoint(event.clientX, event.clientY);
      under !== null;
      under = under.parentElement
    ) {
      const found = nodes.get(under)
      if (found?.listens.includes(event.type) === true) {
        return found
      }
    }
    return node
  }

  /**
   * Hears an event on an element, for the part it is drawn as
   * @param {Element} element - The element
   * @param {Event} event - The event
   * @returns {void}
   */
  const hear = (element, event) => {
    const node = nodes.get(element)
    if (node === undefined || !node.listens.includes(event.type) || handled.has(event)) {
      return
    }
    handled.add(event)
    if (event instanceof PointerEvent && event.type === 'pointerdown' && event.isTrusted) {
      element.setPointerCapture(event.pointerId)
    }
    const { target } = targetOf(event, node)
    const outs = host.dispatch(target.owner, inputOf(event, target))
    if (outs.some((out) => effectType(out) === 'preventDefault')) {
      event.preventDefault()
    }
  }

  /**
   * Makes everything outside a shown modal part inert, and puts back the rest and focus once it is hidden
   * @param {string} key - The part's identity
   * @param {Element} element - Its element
   * @param {boolean} shown - Whether it is shown
   * @returns {void}
   */
  const modal = (key, element, shown) => {
    const open = modals.get(key)
    if (shown && open === undefined) {
      /** @type {Element[]} */
      const inert = []
      for (let at = element; at.parentElement !== null && at !== document.body; at = at.parentElement) {
        for (const sibling of at.parentElement.children) {
          if (sibling !== at && sibling !== live && !sibling.hasAttribute('inert')) {
            sibling.setAttribute('inert', '')
            inert.push(sibling)
          }
        }
      }
      modals.set(key, { inert, restore: document.activeElement })
    } else if (!shown && open !== undefined) {
      modals.delete(key)
      for (const sibling of open.inert) {
        sibling.removeAttribute('inert')
      }
      const focused = document.activeElement
      const lost = focused === null || focused === document.body || element.contains(focused)
      if (open.restore instanceof HTMLElement && lost) {
        open.restore.focus()
      }
    }
  }

  return {
    bind: (key, element, node) => {
      elements.set(key, element)
      nodes.set(element, node)
      const attributes = attributesOf(node, naming, elementFor(node.role).implicitRole)
      for (const name of applied.get(element) ?? []) {
        if (!attributes.has(name)) {
          element.removeAttribute(name)
        }
      }
      for (const [name, value] of attributes) {
        if (value === null) {
          element.removeAttribute(name)
        } else if (element.getAttribute(name) !== value) {
          element.setAttribute(name, value)
        }
      }
      applied.set(element, new Set(attributes.keys()))
      const heard = listening.get(element) ?? new Set()
      for (const type of node.listens) {
        if (!heard.has(type)) {
          heard.add(type)
          element.addEventListener(type, (event) => {
            hear(element, event)
          })
        }
      }
      listening.set(element, heard)
      if (node.aria['modal'] === true) {
        modal(key, element, !node.hidden)
      }
    },
    host,
    live,
    stop: () => {
      host.stop()
      for (const key of modals.keys()) {
        const element = elements.get(key)
        if (element !== undefined) {
          modal(key, element, false)
        }
      }
    },
    unbind: (key) => {
      const element = elements.get(key)
      if (element !== undefined && modals.has(key)) {
        modal(key, element, false)
      }
      elements.delete(key)
    },
  }
}

export { elementFor, identity, idOf, page, partName }
