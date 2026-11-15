/**
 * The contract every widget keeps. A widget is three pure functions over plain data: `init(props)` gives the first
 * state, `step(state, input)` gives the next state and the effects the host carries out, and `view(state, props)`
 * gives the parts and what each means, in ARIA's words. None of them does I/O, reads a clock or randomness, or touches
 * anything global; a widget never calls the host.
 *
 * Inputs are the web's UI Events by name and value (`click`, `keydown` with standard `key` values, pointer and focus
 * events), each naming the part it happened on, plus what the host tells a widget: `answer`, `props`, `time`,
 * `changed`, `confirmed`, `refused`, and geometry only as `scroll` and `measured`. Effects are data the host carries
 * out.
 *
 * A value a widget changes follows one rule: what it shows is the app's value plus its own changes not yet settled.
 * A change shows at once, is emitted with an id, and stays pending until the app's value confirms it (the app's
 * props, or `confirmed` for a collection) or the app refuses it (`refused`), which undoes it. With no value from the
 * app, the widget's value is its own.
 */

/**
 * Plain data: what state, props, inputs and effects are made of. `null`, never `undefined`
 * @typedef {null | boolean | number | string | readonly Data[] | Readonly<{ [field: string]: Data }>} Data
 */

/**
 * An item's identity. Opaque: the core compares keys with `===` and never reads into them
 * @typedef {string | number} Key
 */

/**
 * Where a widget sits among its ancestors: the child names from the outermost widget down; `[]` is the outermost
 * @typedef {readonly string[]} Path
 */

/**
 * A part named from the widget whose view or effect names it: its child names down to it, then the part's name, and
 * the item it is drawn for (`null` for a part drawn once). `{ part: ['trigger'], item: null }` is the widget's own
 * trigger; `{ part: ['list', 'option'], item: k }` is the option drawn for `k` by its child `list`
 * @typedef {Readonly<{ part: readonly string[], item: Key | null }>} Ref
 */

/**
 * An ARIA attribute's value, by the attribute's name without `aria-`: a token, number or text; `true`/`false`; a
 * reference to one part (`activedescendant`, `controls`, `labelledby`) or to several; `null` leaves it out
 * @typedef {string | number | boolean | Ref | readonly Ref[] | null} AriaValue
 */

/**
 * What goes inside a part, in order: one of the widget's own parts (`part`), one drawn per key (`each`, called only for
 * the keys given, which are the window), a child widget's root (`child`), text the widget has (`text`, from its
 * props), or the host's content for an item (`item`: the host draws what the item is; the core never holds it)
 * @typedef {Readonly<{ part: string }>
 *   | Readonly<{ each: string, keys: readonly Key[] }>
 *   | Readonly<{ child: string }>
 *   | Readonly<{ text: string }>
 *   | Readonly<{ item: Key }>} Content
 */

/**
 * A part and what it means. `role` and `aria` are WAI-ARIA's, word for word. `listens` names the inputs the part takes.
 * Beyond ARIA: `tabindex` and `hidden` are HTML's attributes of those names (focusability and whether it is shown,
 * which ARIA has no word for), and `data` holds states ARIA has no word for (an active option under
 * `aria-activedescendant`, a dragged item), which the DOM shows as `data-*`
 * @typedef {Readonly<{
 *   role: string | null,
 *   aria: Readonly<{ [name: string]: AriaValue }>,
 *   data: Readonly<{ [name: string]: string | boolean | null }>,
 *   tabindex: number | null,
 *   hidden: boolean,
 *   listens: readonly string[],
 *   content: readonly Content[],
 * }>} Part
 */

/**
 * A widget's view: its parts by name, each a Part or, for a part drawn once per key, a function of the key. `root` is
 * the part that holds the rest
 * @typedef {Readonly<{ [name: string]: Part | ((item: Key) => Part) }>} View
 */

/**
 * What every input from the host carries: the part it happened on (`part`, the part's own name, and `item`, the key
 * it is drawn for, or `null`), and the event's `timeStamp` (ms, the clock `time` inputs use)
 * @typedef {Readonly<{ part: string, item: Key | null, timeStamp: number }>} On
 */

/**
 * The modifier keys held, as UI Events name them
 * @typedef {Readonly<{ altKey: boolean, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean }>} Modifiers
 */

/**
 * A key pressed. `key` is the UI Events key value (`ArrowDown`, `Enter`, `a`, ` `)
 * @typedef {On & Modifiers & Readonly<{ type: 'keydown', key: string }>} KeyDown
 */

/**
 * A click (a press and release on one part, or Enter or Space on a button)
 * @typedef {On & Modifiers & Readonly<{ type: 'click' }>} Click
 */

/**
 * A pointer event, with the UI Events fields a widget reads. `clientX`/`clientY` are in the target's own units (CSS
 * pixels in a browser, cells in a terminal); a widget's thresholds are props, in the same units
 * @typedef {On & Readonly<{
 *   type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
 *   pointerId: number,
 *   button: number,
 *   clientX: number,
 *   clientY: number,
 * }>} Pointer
 */

/**
 * A mouse button pressed (heard only to keep focus where it is, by preventing its default)
 * @typedef {On & Readonly<{ type: 'mousedown', button: number }>} MouseDown
 */

/**
 * Focus arriving at a part
 * @typedef {On & Readonly<{ type: 'focus' }>} Focused
 */

/**
 * Focus leaving a part
 * @typedef {On & Readonly<{ type: 'blur' }>} Blur
 */

/**
 * A part scrolled: `offset` is how far its content is scrolled, in the target's units (UI Events' `scroll` carries no
 * value; this is its element's `scrollTop`)
 * @typedef {On & Readonly<{ type: 'scroll', offset: number }>} Scroll
 */

/**
 * A part's size, measured by the host, in the target's units
 * @typedef {On & Readonly<{ type: 'measured', size: number }>} Measured
 */

/**
 * An input from the host's events: any of these can happen on any part
 * @typedef {KeyDown | Click | Pointer | MouseDown | Focused | Blur | Scroll | Measured} HostEvent
 */

/**
 * The collection a widget asked about changed: what it holds may be stale
 * @typedef {Readonly<{ type: 'changed' }>} Changed
 */

/**
 * The app took a change the widget emitted (`id`): the collection now has it
 * @typedef {Readonly<{ type: 'confirmed', id: number }>} Confirmed
 */

/**
 * The app refused a change the widget emitted (`id`): the widget undoes it
 * @typedef {Readonly<{ type: 'refused', id: number }>} Refused
 */

/**
 * The props now: the parent's or the app's, whenever they change
 * @template P
 * @typedef {Readonly<{ type: 'props', props: P }>} PropsInput
 */

/**
 * The time, delivered for a `wake` the widget asked for
 * @typedef {Readonly<{ type: 'time', now: number }>} Time
 */

/**
 * The answer to an `ask` for keys: `keys` are the keys at ranks `from`, `from + 1`, ...; `count` is how many items there
 * are. `id` is the ask's
 * @typedef {Readonly<{ type: 'answer', id: number, from: number, keys: readonly Key[], count: number }>} Answer
 */

/**
 * A question for the host about a collection, named by `source`: the keys at ranks `[from, to)`, or (`locate`) a
 * window of `rows` keys that holds a key. The answer comes back to the widget that asked, as `answer` with the same
 * `id`
 * @typedef {Readonly<{ type: 'ask', id: number, source: string, ranks: readonly [number, number] }>
 *   | Readonly<{ type: 'ask', id: number, source: string, locate: Key, rows: number }>} Ask
 */

/**
 * Moves focus to a part
 * @typedef {Readonly<{ type: 'focus' }> & Ref} Focus
 */

/**
 * Asks the host to send a `time` input at `at` (the clock inputs' `timeStamp` uses)
 * @typedef {Readonly<{ type: 'wake', at: number }>} Wake
 */

/**
 * Tells the app a value changed. `id` names the change, for `refused`
 * @template T
 * @typedef {Readonly<{ type: 'change', value: T, id: number }>} Change
 */

/**
 * Something for screen readers to say: which message (`message`, an id the host words in its language) and what it
 * is about (`values`, keys among them, which the host names)
 * @typedef {Readonly<{
 *   type: 'announce',
 *   message: string,
 *   values: Readonly<{ [field: string]: Data }>,
 *   urgent: boolean,
 * }>} Announce
 */

/**
 * Prevents the default action of the event being handled (a key scrolling the page, a press moving focus). The host
 * applies it while the event is still being dispatched, which it can because `step` is synchronous
 * @typedef {Readonly<{ type: 'preventDefault' }>} PreventDefault
 */

/**
 * The result of a step: the next state and the effects, in order
 * @template S, E
 * @typedef {readonly [S, readonly E[]]} Result
 */

/**
 * A widget: three pure functions. `init` gives the first state and what to do at once (a list asks for its first
 * window)
 * @template P, S, I, E
 * @typedef {Readonly<{
 *   init: (props: P) => Result<S, E>,
 *   step: (state: S, input: I) => Result<S, E>,
 *   view: (state: S, props: P) => View,
 * }>} Widget
 */

/**
 * A part, with nothing it doesn't name: no role, no ARIA, no states, not focusable, shown, listening to nothing, empty
 * @param {Partial<Part>} given - What the part has
 * @returns {Part} The part
 */
function part(given) {
  return { aria: {}, content: [], data: {}, hidden: false, listens: [], role: null, tabindex: null, ...given }
}

/**
 * A reference to a part, from the widget naming it
 * @param {readonly string[]} path - Child names down to the part, then the part's name
 * @param {Key | null} item - The item it is drawn for, or `null`
 * @returns {Ref} The reference
 */
function ref(path, item) {
  return { item, part: path }
}

export { part, ref }
