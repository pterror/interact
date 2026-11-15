/**
 * What a part means, in the DOM's words, and DOM events as the contract's inputs: shared by the DOM and Solid
 * renderers. ARIA states become `aria-*` attributes as they are (a reference becomes the referenced part's id), `data`
 * becomes `data-*`, and `tabindex` and `hidden` are HTML's. Events pass through by name and value.
 */

/** @import { Node, Out, Target } from './compose.js' */
/** @import { Key } from './contract.js' */

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

export { attributesOf, effectTarget, effectType, elementFor, identity, idOf, inputOf, partName }
