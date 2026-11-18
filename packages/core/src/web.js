/**
 * What a part means, in the DOM's words, and DOM events as the contract's inputs: shared by the DOM and Solid
 * renderers. ARIA states become `aria-*` attributes as they are (a reference becomes the referenced part's id), `data`
 * becomes `data-*`, and `tabindex` and `hidden` are HTML's. Events pass through by name and value: an event goes to
 * the innermost part listening for it, and a pointer event to the part under the pointer, the pressed element
 * capturing the pointer so its release is never missed. `aria-modal` is carried out here: while a modal part is shown,
 * everything outside it is inert, the document doesn't scroll, and focus goes back where it was when it closes. A
 * popup is a manual popover, in the top layer while it is shown (the widget closes it, never the browser), placed
 * against its anchor by CSS anchor positioning: below it, starting where it starts, flipped to the other side across,
 * along or both when it doesn't fit, the popup's margin the gap on the side it grows towards. A press outside the popup
 * shown last (on the page around it, inert or not) is heard by it, if it listens for it.
 */

import { prefixedIds } from './dom-ids.js'
import { host as run } from './host.js'
import { identity } from './target.js'
import { announcement } from './words.js'

/** @import { Node, Out, Target } from './compose.js' */
/** @import { Key } from './contract.js' */
/** @import { Host, HostOptions, Source } from './host.js' */
/** @import { Words } from './words.js' */

/**
 * How a host names things in the DOM: the prefix of every id, a key as text for ids, and optionally the ids of the
 * elements outside the widget it refers to, by the names it gives them
 * The app can supply the complete resolver, or use the prefix-and-key convenience form. Part attributes, ARIA
 * references and DOM lookups all use this same naming. Neither form determines a part's internal identity.
 * @typedef {Readonly<{ outside?: Readonly<{ [name: string]: string }> }> & (
 *   Readonly<{ idOf: (target: Target) => string }>
 *   | Readonly<{ id: string, keyId: (key: Key) => string }>
 * )} Naming
 */

/**
 * A part's id in the document
 * @param {Target} target - The part
 * @param {Naming} naming - The host's naming
 * @returns {string} The id
 */
function idOf(target, naming) {
  if ('idOf' in naming) {
    return naming.idOf(target)
  }
  const name = [...target.owner, target.part].join('-')
  const part = target.item === null ? name : `${name}-${naming.keyId(target.item)}`
  return `${naming.id}-${part}`
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
 * The attributes a part has in the DOM, `null` for one it doesn't have. Pure, so a server renders them as the client
 * does
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
    ['popover', node.popup === null ? null : 'manual'],
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
  if ('outside' in value) {
    return naming.outside?.[value.outside] ?? null
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
    return {
      ...base,
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    }
  }
  if (event instanceof MouseEvent) {
    return { ...base, ...modifiers(event), button: event.button }
  }
  if (event.type === 'scroll' && event.currentTarget instanceof Element) {
    return { ...base, offset: event.currentTarget.scrollTop }
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
 * The part's name as the app names it to replace or style it: its own name (`trigger`, `option`), and for a child's
 * root, the child's name (`list`); the outermost root is `root`
 * @param {Target} target - The part
 * @returns {string} The name
 */
function partName(target) {
  return target.part === 'root' ? (target.owner.at(-1) ?? 'root') : target.part
}

/**
 * An item's text in the collection it is from, as a host draws and names it when the app draws it no other way: the
 * source's text for it, or the key as text
 * @param {Readonly<{ item: Key, source: string }>} content - The item, and its collection
 * @param {Readonly<{ [name: string]: Source }> | undefined} sources - The collections the host holds
 * @returns {string} Its text
 */
function itemText(content, sources) {
  return sources?.[content.source]?.text?.(content.item) ?? String(content.item)
}

/**
 * The ARIA attributes that are states (https://www.w3.org/TR/wai-aria-1.2/#state_prop_def), by the names views give
 * them
 */
const ARIA_STATES = ['busy', 'checked', 'current', 'disabled', 'expanded', 'invalid', 'pressed', 'selected']

/**
 * The states a part shows now: each ARIA state it has as `true`, and each of its `data` fields set, by name
 * @param {Node} node - The part
 * @returns {string[]} Their names
 */
function statesOf(node) {
  const aria = ARIA_STATES.filter((name) => node.aria[name] === true || node.aria[name] === 'true')
  const data = Object.keys(node.data).filter((name) => {
    const value = node.data[name]
    return value === true || (typeof value === 'string' && value !== '')
  })
  return [...aria, ...data]
}

/**
 * The role an element has without a `role` attribute, as far as parts go: a `button`'s
 * @param {Element} element - The element
 * @returns {string | null} The role
 */
function implicitRoleOf(element) {
  return element.localName === 'button' ? 'button' : null
}

/**
 * The element focus is in, inside any shadow roots
 * @returns {Element | null} The element
 */
function focusedElement() {
  let focused = document.activeElement
  while (focused?.shadowRoot?.activeElement !== null && focused?.shadowRoot?.activeElement !== undefined) {
    focused = focused.shadowRoot.activeElement
  }
  return focused
}

/**
 * Whether a node is a shadow root (by its type: a class test fails across realms)
 * @param {globalThis.Node | null} node - The node
 * @returns {node is ShadowRoot} Whether it is
 */
function isShadowRoot(node) {
  return node !== null && node.nodeType === node.DOCUMENT_FRAGMENT_NODE && 'host' in node
}

/**
 * Whether a node is a document or a shadow root, which find elements by id
 * @param {globalThis.Node} node - The node
 * @returns {node is Document | ShadowRoot} Whether it is
 */
function findsById(node) {
  return node.nodeType === node.DOCUMENT_NODE || isShadowRoot(node)
}

/**
 * The element an element is in, out of a shadow root into its host
 * @param {Element} element - The element
 * @returns {Element | null} Its parent, or the host of the shadow root it is the top of
 */
function outerParent(element) {
  const parent = element.parentNode
  return isShadowRoot(parent) ? parent.host : element.parentElement
}

/**
 * The elements beside an element, in its parent or the shadow root it is the top of
 * @param {Element} element - The element
 * @returns {readonly Element[]} Its siblings, itself among them
 */
function siblingsOf(element) {
  const parent = element.parentNode
  return isShadowRoot(parent) ? [...parent.children] : [...(element.parentElement?.children ?? [])]
}

/**
 * What the page needs from the app: what the host needs, and optionally how ids are made (by default a prefix of its
 * own and each key as text), the words announcements use over the English ones, an item's name in them (by default
 * the key as text), and the elements outside the widget it refers to that have no id in its naming, by name, as they
 * are now (referred to by ARIA's element properties, which reach out of a shadow root). A click on an outside element
 * that labels a focusable part focuses that part, as a `<label>` does its field
 * @typedef {HostOptions & Readonly<{
 *   naming?: Naming,
 *   words?: Words,
 *   name?: (key: Key) => string,
 *   outside?: (name: string) => Element | null,
 * }>} PageOptions
 */

/**
 * The document's scrolling as it was before the first modal part shown locked it, and how many lock it now
 * @type {{ count: number, overflow: string, paddingRight: string }}
 */
const scrolling = { count: 0, overflow: '', paddingRight: '' }

/**
 * Keeps the document from scrolling while a modal part is shown, its scrollbar's width kept as padding so nothing
 * moves; the last one shown that closes gives scrolling back
 * @param {boolean} locked - Whether a modal part is shown now, or one closed
 * @returns {void}
 */
function lockScroll(locked) {
  const { style } = document.documentElement
  if (locked) {
    if (scrolling.count === 0) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth
      scrolling.overflow = style.overflow
      scrolling.paddingRight = style.paddingRight
      style.overflow = 'hidden'
      if (scrollbar > 0) {
        style.paddingRight = `${String(scrollbar)}px`
      }
    }
    scrolling.count += 1
    return
  }
  scrolling.count -= 1
  if (scrolling.count === 0) {
    style.overflow = scrolling.overflow
    style.paddingRight = scrolling.paddingRight
  }
}

/**
 * The anchor name a part is placed against by, from its id: a dashed ident
 * @param {string} id - The anchor's id
 * @returns {string} The name
 */
function anchorName(id) {
  return `--${typeof CSS === 'undefined' ? id.replaceAll(/[^\w-]/gu, '_') : CSS.escape(id)}`
}

/**
 * Whether an element is a popover shown now (none is where the browser has no popovers)
 * @param {Element} element - The element
 * @returns {boolean} Whether it is
 */
function isOpenPopover(element) {
  return hasPopovers(element) && element.matches(':popover-open')
}

/**
 * Whether an element can be a popover (it can't where the browser has no popovers)
 * @param {Element} element - The element
 * @returns {element is HTMLElement} Whether it can
 */
function hasPopovers(element) {
  return (
    element instanceof HTMLElement &&
    typeof (/** @type {{ showPopover?: unknown }} */ (element).showPopover) === 'function'
  )
}

/**
 * Shows or hides a popup's element as a popover, placed against its anchor's element
 * @param {Element} element - The popup's element
 * @param {Node} node - The popup
 * @param {Element | null} anchor - Its anchor's element, if it has one drawn
 * @returns {void}
 */
function placePopup(element, node, anchor) {
  if (!hasPopovers(element) || !element.isConnected) {
    return
  }
  const open = isOpenPopover(element)
  if (node.hidden) {
    if (open) {
      element.hidePopover()
    }
    return
  }
  if (anchor instanceof HTMLElement) {
    const name = anchorName(anchor.id)
    anchor.style.setProperty('anchor-name', name)
    element.style.setProperty('position-anchor', name)
    element.style.setProperty('inset', 'auto')
    element.style.setProperty('inset-block-start', 'anchor(end)')
    element.style.setProperty('inset-inline-start', 'anchor(start)')
    element.style.setProperty('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline')
  }
  if (!open) {
    element.showPopover()
  }
}

/** ARIA's element properties, by the attribute they reflect, for the references to several elements */
const ELEMENTS_PROPERTY = new Map([
  ['controls', 'ariaControlsElements'],
  ['describedby', 'ariaDescribedByElements'],
  ['details', 'ariaDetailsElements'],
  ['errormessage', 'ariaErrorMessageElements'],
  ['flowto', 'ariaFlowToElements'],
  ['labelledby', 'ariaLabelledByElements'],
  ['owns', 'ariaOwnsElements'],
])

let made = 0

/**
 * Ids the host makes when the app names nothing: a prefix no other widget on the page has, and each key as text
 * @returns {Naming} The naming
 */
function ownNaming() {
  made += 1
  return prefixedIds(`interact${String(made)}`)
}

/**
 * A widget running in a page: `bind` gives an element a part's meaning and listeners (again on each change);
 * `listen` gives it only the listeners, and the modality, for a renderer that draws the attributes itself (from
 * `attributesOf`, as a server does); `drawn` listens on every part of a tree such a renderer has drawn, each found by
 * its id in the document or shadow root `within` is in (none while `within` is in neither), lets go of the parts it
 * drew before and no longer does, and then focuses or reveals what the widget asked to since: a renderer calling it
 * draws a change after the host tells it, so those made with a change wait for it to be drawn; `unbind` lets go of a part no longer drawn. Making a page
 * touches no DOM; once stopped, it listens on nothing more
 * @typedef {Readonly<{
 *   host: Host,
 *   naming: Naming,
 *   bind: (key: string, element: Element, node: Node) => void,
 *   listen: (key: string, element: Element, node: Node) => void,
 *   drawn: (tree: Node, within: Element) => void,
 *   unbind: (key: string) => void,
 *   stop: () => void,
 * }>} Page
 */

/**
 * Runs a widget in a page
 * @param {PageOptions} options - The widget and how the app takes part
 * @param {() => Element | null} live - The live region announcements are said in, which the renderer draws (none
 *   until it has)
 * @returns {Page} The running widget, for a renderer to draw
 */
function page(options, live) {
  const naming = options.naming ?? ownNaming()
  const words = options.words ?? {}
  const nameOf = options.name ?? String
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
  /** @type {Set<string>} */
  const popups = new Set()
  /**
   * The popups shown, by identity, the last shown last
   * @type {string[]}
   */
  const shownPopups = []
  /** @type {Set<string>} */
  const outsideTypes = new Set()
  /**
   * The parts each outside element that labels them focuses when clicked
   * @type {WeakMap<Element, Element>}
   */
  const labelling = new WeakMap()

  /** Whether the renderer draws a change after the host has told it (it calls `drawn` once it has) */
  let drawsLater = false
  /** Whether the widget has changed since such a renderer last drew it */
  let changed = false
  /** @type {Out[]} */
  const parked = []

  /**
   * Focuses or reveals the part an effect names
   * @param {Out} out - The effect
   * @returns {void}
   */
  const onPart = (out) => {
    const target = effectTarget(out)
    const element = target === null ? undefined : elements.get(identity(target))
    if (element instanceof HTMLElement && effectType(out) === 'focus') {
      element.focus()
    } else if (element !== undefined) {
      element.scrollIntoView({ block: 'nearest' })
    }
  }

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
      if (drawsLater && changed) {
        parked.push(out)
      } else {
        onPart(out)
      }
      return
    }
    if (type === 'announce') {
      const region = live()
      if (region !== null) {
        region.textContent = announcement(out, words, nameOf)
      }
      return
    }
    options.effect?.(out, running)
  }

  const host = run({ ...options, effect })
  host.watch(() => {
    changed = true
  })

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
    const root = event.currentTarget instanceof Element ? event.currentTarget.getRootNode() : document
    const at = isShadowRoot(root) ? root : document
    for (let under = at.elementFromPoint(event.clientX, event.clientY); under !== null; under = under.parentElement) {
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
   * Hears an event in the document that no part took: a press outside the popup shown last is that popup's
   * @param {Event} event - The event
   * @returns {void}
   */
  const outside = (event) => {
    const key = shownPopups.at(-1)
    const element = key === undefined ? undefined : elements.get(key)
    if (stopped || element === undefined || handled.has(event) || event.composedPath().includes(element)) {
      return
    }
    hear(element, event)
  }

  /**
   * Notes a popup shown or hidden, and listens in the document for presses outside it
   * @param {string} key - The popup's identity
   * @param {Node} node - The popup
   * @returns {void}
   */
  const showing = (key, node) => {
    const at = shownPopups.indexOf(key)
    if (node.hidden) {
      if (at !== -1) {
        shownPopups.splice(at, 1)
      }
      return
    }
    if (at === -1) {
      shownPopups.push(key)
    }
    for (const type of node.listens) {
      if (!outsideTypes.has(type)) {
        outsideTypes.add(type)
        document.addEventListener(type, outside)
      }
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
      const region = live()
      for (let at = element; at !== document.body;) {
        const parent = outerParent(at)
        if (parent === null) {
          break
        }
        for (const sibling of siblingsOf(at)) {
          if (sibling !== at && sibling !== region && !sibling.hasAttribute('inert')) {
            sibling.setAttribute('inert', '')
            inert.push(sibling)
          }
        }
        at = parent
      }
      modals.set(key, { inert, restore: focusedElement() })
      lockScroll(true)
    } else if (!shown && open !== undefined) {
      modals.delete(key)
      lockScroll(false)
      for (const sibling of open.inert) {
        sibling.removeAttribute('inert')
      }
      const focused = focusedElement()
      const lost = focused === null || focused === document.body || element.contains(focused)
      if (open.restore instanceof HTMLElement && lost) {
        open.restore.focus()
      }
    }
  }

  /**
   * Gives an element a part's listeners, and carries out its modality
   * @param {string} key - The part's identity
   * @param {Element} element - Its element
   * @param {Node} node - The part
   * @returns {void}
   */
  const listen = (key, element, node) => {
    if (stopped) {
      return
    }
    elements.set(key, element)
    nodes.set(element, node)
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
    if (node.popup !== null) {
      popups.add(key)
      showing(key, node)
      popup(key, element, node)
    }
    refer(element, node)
  }

  /**
   * Points a part's ARIA references to elements outside the widget at them: by the id the naming gives (an attribute
   * drawn with the rest), or by ARIA's element properties for an element without one; and makes a click on its label
   * focus a focusable part
   * @param {Element} element - The part's element
   * @param {Node} node - The part
   * @returns {void}
   */
  const refer = (element, node) => {
    for (const [name, value] of Object.entries(node.aria)) {
      const named = typeof value === 'object' && value !== null && 'outside' in value ? value.outside : null
      const id = named === null ? undefined : naming.outside?.[named]
      const rooted = element.getRootNode()
      const root = findsById(rooted) ? rooted : element.ownerDocument
      // oxlint-disable-next-line unicorn/prefer-query-selector -- an app's id need not be a CSS identifier
      const byId = id === undefined ? null : root.getElementById(id)
      const outsideElement =
        named === null ? null : (byId ?? (id === undefined ? (options.outside?.(named) ?? null) : null))
      const property = ELEMENTS_PROPERTY.get(name)
      if (named !== null && id === undefined && property !== undefined && property in element) {
        Reflect.set(element, property, outsideElement === null ? null : [outsideElement])
      }
      if (name === 'labelledby' && outsideElement !== null && node.tabindex !== null) {
        label(outsideElement, element)
      }
    }
  }

  /**
   * Makes a click on an element outside focus the part it labels
   * @param {Element} outsideElement - The label
   * @param {Element} element - The part's element
   * @returns {void}
   */
  const label = (outsideElement, element) => {
    if (!labelling.has(outsideElement)) {
      outsideElement.addEventListener('click', () => {
        const labelled = labelling.get(outsideElement)
        if (!stopped && labelled instanceof HTMLElement) {
          labelled.focus()
        }
      })
    }
    labelling.set(outsideElement, element)
  }

  /**
   * Shows or hides a popup, once its element is in the document (a renderer may bind it before it puts it there)
   * @param {string} key - The popup's identity
   * @param {Element} element - Its element
   * @param {Node} node - The popup
   * @returns {void}
   */
  const popup = (key, element, node) => {
    const { anchor } = node.popup ?? { anchor: null }
    const place = () => {
      if (elements.get(key) === element) {
        const root = element.getRootNode()
        const id = anchor === null ? null : idOf(anchor, naming)
        // oxlint-disable-next-line unicorn/prefer-query-selector -- an id from a key need not be a CSS identifier
        placePopup(element, node, id !== null && findsById(root) ? root.getElementById(id) : null)
      }
    }
    if (element.isConnected) {
      place()
    } else {
      queueMicrotask(place)
    }
  }

  /**
   * Lets go of a part
   * @param {string} key - Its identity
   * @returns {void}
   */
  const unbind = (key) => {
    const element = elements.get(key)
    if (element !== undefined && modals.has(key)) {
      modal(key, element, false)
    }
    if (popups.delete(key) && element instanceof HTMLElement && isOpenPopover(element)) {
      element.hidePopover()
    }
    const at = shownPopups.indexOf(key)
    if (at !== -1) {
      shownPopups.splice(at, 1)
    }
    elements.delete(key)
  }

  /** @type {Set<string>} */
  let listened = new Set()
  let stopped = false

  return {
    bind: (key, element, node) => {
      const attributes = attributesOf(node, naming, implicitRoleOf(element))
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
      listen(key, element, node)
    },
    drawn: (tree, within) => {
      drawsLater = true
      changed = false
      const root = within.getRootNode()
      /** @type {Set<string>} */
      const now = new Set()
      /** @type {Node[]} */
      const parts = [tree]
      for (let node = parts.pop(); node !== undefined; node = parts.pop()) {
        const key = identity(node.target)
        const id = idOf(node.target, naming)
        // oxlint-disable-next-line unicorn/prefer-query-selector -- an id from a key need not be a CSS identifier
        const element = findsById(root) ? root.getElementById(id) : null
        if (element !== null) {
          now.add(key)
          listen(key, element, node)
        }
        for (const content of node.content) {
          if ('target' in content) {
            parts.push(content)
          }
        }
      }
      for (const key of listened) {
        if (!now.has(key)) {
          unbind(key)
        }
      }
      listened = now
      for (const out of parked.splice(0)) {
        onPart(out)
      }
    },
    host,
    listen,
    naming,
    stop: () => {
      stopped = true
      host.stop()
      for (const type of outsideTypes) {
        document.removeEventListener(type, outside)
      }
      for (const key of modals.keys()) {
        const element = elements.get(key)
        if (element !== undefined) {
          modal(key, element, false)
        }
      }
    },
    unbind,
  }
}

export { identity } from './target.js'
export { ARIA_STATES, attributesOf, elementFor, idOf, itemText, page, partName, statesOf }
