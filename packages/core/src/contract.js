/**
 * The contract every widget keeps. A widget is three pure functions over plain data: `init(props)` gives the first
 * state, `step(state, input)` gives the next state and the effects the host carries out, and `view(state, props)`
 * gives the parts and what each means, in ARIA's words. None of them does I/O, reads a clock or randomness, or touches
 * anything global; a widget never calls the host.
 *
 * Inputs are the web's UI Events by name and value (`click`, `keydown` with standard `key` values, pointer and focus
 * events), each naming the part it happened on, plus `answer`, `props` and `time`. Effects are data the host carries
 * out.
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
 * A pointer event, with the UI Events fields a widget reads. `clientX`/`clientY` are CSS pixels
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
 * An input from the host's events: any of these can happen on any part
 * @typedef {KeyDown | Click | Pointer | MouseDown | Focused | Blur} HostEvent
 */

/**
 * The props now: the parent's or the app's. Delivered once when a widget starts, and whenever they change
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
 * A question for the host: the keys at ranks `[from, to)`, or (`locate`) a window of `rows` keys that holds a key.
 * The answer comes back to the widget that asked, as `answer` with the same `id`
 * @typedef {Readonly<{ type: 'ask', id: number, ranks: readonly [number, number] }>
 *   | Readonly<{ type: 'ask', id: number, locate: Key, rows: number }>} Ask
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
 * Tells the app a value changed
 * @template T
 * @typedef {Readonly<{ type: 'change', value: T }>} Change
 */

/**
 * Something for screen readers to say. `message` is what happened, as data: the host words it, since words are the
 * app's (its language, its items' names)
 * @typedef {Readonly<{ type: 'announce', message: Readonly<{ [field: string]: Data }>, urgent: boolean }>} Announce
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
 * A widget: three pure functions
 * @template P, S, I, E
 * @typedef {Readonly<{
 *   init: (props: P) => S,
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
