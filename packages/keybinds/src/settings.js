/**
 * <keybinds-settings>: the panel where people rebind commands and axes, recording new bindings, settling conflicts and
 * resetting to the defaults.
 *
 * Attributes: `open`.
 *
 * Properties: `store` (the BindingsStore it edits), `inputs` (which bindings are shown and can be recorded; default
 * keys only), `releases`, `holds`, `sequences` (whether release, hold and tap, and several-step bindings can be
 * recorded: set them when keybinds() has releases(), holds(), sequences()), `open`.
 *
 * Events: `close` when it's dismissed; `change` (detail: { commandId, bindings }) when a binding changes; `reset`
 * (detail: { commandId? }) when bindings are reset.
 *
 * Classes: .settings, __backdrop, __dialog, __header, __title, __reset-all, __group, __group-title, __list, __item,
 * __item-label, __item-bindings, __item-reset, __binding (--recording), __binding-keys, __binding-key,
 * __binding-remove, __item-add, __recording-overlay, __conflict.
 *
 * It shows a group per category, a row per command or axis with its bindings, the prompt where one is being recorded,
 * and the question where a binding is taken. Recording captures a press, or a release, hold or tap, in one step or
 * several, until a binding is recorded or Escape; each edit is saved to the store as the fields that differ from the
 * command's defaults, and announced.
 */

/**
 * @import { BindingOverrides } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { formatBinding } from './binding-format.js'
import { RELEASE_SUFFIX, bindingLookup, findConflict, flipRelease, splitRelease } from './binding.js'
import { OVERLAY_STYLE, make, styleOf } from './component-dom.js'
import { keysUI } from './keys-ui.js'
import { markKind } from './modal.js'

const PAUSE = 1000

/**
 * Every field that holds bindings
 * @type {readonly Field[]}
 */
const FIELDS = ['axes', 'gamepad', 'keys', 'mouse']

const SETTINGS_STYLE = `${OVERLAY_STYLE}
@layer keybinds.structure {
  :where(.settings__backdrop) { position: fixed; inset: 0; }
}`

/**
 * A field that holds bindings: one an input reads
 * @typedef {InputUI['field']} Field
 */

/**
 * One command's bindings in the fields the panel shows, each a list
 * @typedef {Readonly<Partial<Record<Field, readonly string[]>>>} Lists
 */

/**
 * Which binding: a command's, through an input, and which of its bindings (undefined for a new one)
 * @typedef {Readonly<{ id: string, index: number | undefined, input: InputUI }>} Slot
 */

/**
 * A binding that's taken, waiting on whether to replace the other command's: the binding, the slot it's for, the
 * other command's id and label, and whether it came from switching a binding's form rather than recording
 * @typedef {Readonly<{ binding: string, flip: boolean, id: string, label: string, slot: Slot }>} Conflict
 */

/**
 * A command's bindings in effect, in the fields of the inputs shown
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @param {readonly InputUI[]} inputs - The inputs shown
 * @returns {Lists} Its bindings, an empty list in each field it has none
 */
function listsOf(store, id, inputs) {
  const bound = store.lookup(id)
  return Object.fromEntries(inputs.map((input) => [input.field, bound?.[input.field] ?? []]))
}

/**
 * The overrides without one command's
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @returns {BindingOverrides} The rest
 */
function overridesWithout(store, id) {
  const rest = new Map(Object.entries(store.getOverrides()))
  rest.delete(id)
  return Object.fromEntries(rest)
}

/**
 * Whether an event happened on one of the switches in the recording prompt, whose clicks aren't recorded
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
function onSwitch(event) {
  return event
    .composedPath()
    .some((node) => node instanceof HTMLButtonElement && node.className.startsWith('settings__recording-'))
}

/**
 * A button with its class, part names and label, doing something when clicked
 * @param {Readonly<{ className: string, part: string, text: string }>} made - Its class, part names and label
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The button
 */
function button(made, click) {
  const element = make('button', made)
  element.addEventListener('click', click)
  return element
}

/**
 * A switch: a button that shows whether it's on
 * @param {Readonly<{ className: string, label: string, name: string, on: boolean }>} made - Its class, label, part
 *   name ("binding-release" is also "binding-release-on" while on), and whether it's on
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The switch
 */
function toggle({ className, label, name, on }, click) {
  const element = button({ className, part: on ? `${name} ${name}-on` : name, text: label }, click)
  element.setAttribute('aria-pressed', String(on))
  return element
}

/**
 * A switch in the recording prompt, named `settings__recording-<name>` with the part `recording-<name>`
 * @param {string} label - Its label
 * @param {string} name - Its name
 * @param {boolean} on - Whether it's on
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The switch
 */
function promptSwitch(label, name, on, click) {
  return toggle({ className: `settings__recording-${name}`, label, name: `recording-${name}`, on }, click)
}

/**
 * The box a binding being recorded is shown in
 * @returns {HTMLSpanElement} The box
 */
function recordingBox() {
  return make('span', {
    className: 'settings__binding settings__binding--recording',
    part: 'binding binding-recording',
  })
}

/**
 * The category a row goes under: its own, or "Other"
 * @param {Readonly<{ category?: string | undefined }>} binding - The row's bindings
 * @returns {string} The category
 */
function categoryOf({ category }) {
  return category === undefined || category === '' ? 'Other' : category
}

/** The panel where people rebind commands and axes */
class KeybindSettings extends HTMLElement {
  static kind = 'settings'
  static observedAttributes = ['open']
  /** How long recording a sequence waits after a step before taking the steps so far, in milliseconds */
  static SEQUENCE_PAUSE = PAUSE

  /** Whether release bindings ("k:up") can be recorded and switched to */
  releases = false
  /** Whether hold and tap bindings ("k:hold", "k:tap") can be recorded */
  holds = false
  /** Whether bindings of several steps ("g i") can be recorded */
  sequences = false
  /** @type {AnyBindingsStore | undefined} */
  #store
  /** @type {readonly InputUI[]} */
  #inputs = [keysUI()]
  /** @type {readonly (() => void)[]} */
  #unwatch = []
  /** @readonly */
  #rerender = () => {
    this.#refresh()
  }
  /**
   * A taken binding, waiting on whether to replace the other command's
   * @type {Conflict | undefined}
   */
  #conflict
  /**
   * The binding being recorded, or being changed while a switch to it waits on a conflict
   * @type {Slot | undefined}
   */
  #slot
  /** What's captured: a press "", or ":up", ":hold", ":tap" */
  #suffix = ''
  /** Whether the binding being recorded takes several steps */
  #sequence = false
  /**
   * The steps recorded so far
   * @type {readonly string[]}
   */
  #steps = []
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer
  /** @type {(() => void) | undefined} */
  #stopRecorder
  /**
   * The window recording listens in
   * @type {Window | undefined}
   */
  #window
  /** @readonly */
  #escape = this.#escaped.bind(this)
  /** @readonly */
  #dialog = make('div', { className: 'settings__dialog', part: 'dialog' })

  /** Builds the panel's shadow DOM: a backdrop, and the dialog its contents go in */
  constructor() {
    super()
    const backdrop = make('div', { className: 'settings__backdrop', part: 'backdrop' })
    this.#dialog.setAttribute('role', 'dialog')
    this.#dialog.setAttribute('aria-modal', 'true')
    this.#dialog.setAttribute('aria-label', 'Keybind Settings')
    const root = make('div', { className: 'settings', part: 'settings' })
    root.append(backdrop, this.#dialog)
    this.attachShadow({ mode: 'open' }).append(styleOf(SETTINGS_STYLE), root)
    backdrop.addEventListener('click', () => {
      this.#close()
    })
  }

  /** @returns {AnyBindingsStore | undefined} The store it edits */
  get store() {
    return this.#store
  }

  /** @param {AnyBindingsStore | undefined} store - The store it edits */
  set store(store) {
    this.#store?.removeEventListener('change', this.#rerender)
    this.#store = store
    store?.addEventListener('change', this.#rerender)
    this.#refresh()
  }

  /** @returns {readonly InputUI[]} Which bindings are shown and can be recorded */
  get inputs() {
    return this.#inputs
  }

  /** @param {readonly InputUI[]} inputs - Which bindings are shown and can be recorded */
  set inputs(inputs) {
    this.#inputs = inputs
    if (this.isConnected) {
      this.#watch()
    }
    this.#refresh()
  }

  /** @returns {boolean} Whether it's open */
  get open() {
    return this.hasAttribute('open')
  }

  /** @param {boolean} open - Whether it's open */
  set open(open) {
    this.toggleAttribute('open', open)
  }

  /**
   * Follows its `open` attribute: opening shows the bindings as they are, closing stops recording
   * @param {string} _name - Which changed
   * @param {string | null} _previous - Its value before
   * @param {string | null} value - Its value now
   * @returns {void}
   */
  attributeChangedCallback(_name, _previous, value) {
    this.#stop()
    if (value !== null) {
      this.#render()
    }
  }

  /** @returns {void} */
  connectedCallback() {
    markKind(this, KeybindSettings.kind, true)
    this.#watch()
  }

  /** @returns {void} */
  disconnectedCallback() {
    this.#stop()
    for (const stop of this.#unwatch) {
      stop()
    }
    this.#unwatch = []
    this.#store?.removeEventListener('change', this.#rerender)
  }

  /**
   * Follows whether each input can be recorded now (a pad connected), so its add button comes and goes
   * @returns {void}
   */
  #watch() {
    for (const stop of this.#unwatch) {
      stop()
    }
    this.#unwatch = this.#inputs.flatMap((input) => (input.watch === undefined ? [] : [input.watch(this.#rerender)]))
  }

  /** @returns {void} */
  #close() {
    this.#stop()
    this.open = false
    this.dispatchEvent(new CustomEvent('close'))
  }

  /** @returns {void} */
  #refresh() {
    if (this.open) {
      this.#render()
    }
  }

  /**
   * Stops recording, and forgets any question
   * @returns {void}
   */
  #stop() {
    this.#stopRecording()
    this.#conflict = undefined
  }

  /**
   * Stops recording, and forgets what it was recording
   * @returns {void}
   */
  #stopRecording() {
    this.#stopRecorder?.()
    this.#stopRecorder = undefined
    this.#window?.removeEventListener('keydown', this.#escape, true)
    this.#window = undefined
    clearTimeout(this.#timer)
    this.#slot = undefined
    this.#suffix = ''
    this.#sequence = false
    this.#steps = []
  }

  /**
   * Starts recording a binding from what's done next in the panel's window, until it's recorded, Escape, or the panel
   * stops it
   * @param {Slot} slot - Which binding
   * @returns {void}
   */
  #record(slot) {
    this.#conflict = undefined
    this.#stopRecording()
    this.#slot = slot
    const window = this.ownerDocument.defaultView ?? globalThis.window
    this.#window = window
    window.addEventListener('keydown', this.#escape, true)
    this.#listen()
    this.#render()
  }

  /**
   * Stops recording on Escape, which isn't recorded
   * @param {Event} event - A key going down in the window
   * @returns {void}
   */
  #escaped(event) {
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.#stopRecording()
      this.#render()
    }
  }

  /**
   * Switches what's captured; choosing what's already chosen goes back to a press
   * @param {string} suffix - ":up", ":hold" or ":tap"
   * @returns {void}
   */
  #capture(suffix) {
    this.#suffix = this.#suffix === suffix ? '' : suffix
    if (this.#suffix !== '') {
      this.#sequence = false
    }
    this.#listen()
    this.#render()
  }

  /**
   * Switches between one step and several
   * @returns {void}
   */
  #toggleSteps() {
    this.#sequence = !this.#sequence
    if (this.#sequence) {
      this.#suffix = ''
    }
    this.#steps = []
    clearTimeout(this.#timer)
    this.#listen()
    this.#render()
  }

  /**
   * Takes the steps recorded so far as the binding
   * @returns {void}
   */
  #finish() {
    clearTimeout(this.#timer)
    if (this.#steps.length > 0) {
      this.#recorded(this.#steps.join(' '))
    }
  }

  /**
   * (Re)starts the input's recorder, for a press or a release as the switches say
   * @returns {void}
   */
  #listen() {
    this.#stopRecorder?.()
    this.#stopRecorder = undefined
    const input = this.#slot?.input
    if (input?.record === undefined || this.#window === undefined) {
      return
    }
    this.#stopRecorder = input.record(
      { ignore: onSwitch, release: this.#suffix === RELEASE_SUFFIX, target: this.#window },
      (binding) => {
        this.#heard(input, binding)
      },
    )
  }

  /**
   * The input's recorder heard a binding: one step of a sequence, which waits for the next or a pause, or the whole
   * binding. One that can't be held or tapped (a scroll) isn't recorded while that's asked for
   * @param {InputUI} input - The input it came through
   * @param {string} binding - The binding
   * @returns {void}
   */
  #heard(input, binding) {
    const suffix = this.#suffix
    if (suffix !== '' && input.release !== undefined && !input.release(binding)) {
      return
    }
    if (!this.#sequence) {
      this.#recorded(suffix === '' || suffix === RELEASE_SUFFIX ? binding : binding + suffix)
      return
    }
    this.#steps = [...this.#steps, binding]
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.#finish()
    }, KeybindSettings.SEQUENCE_PAUSE)
    this.#listen()
    this.#render()
  }

  /**
   * A binding was recorded: it takes its slot, unless it's taken, which asks first
   * @param {string} binding - The binding
   * @returns {void}
   */
  #recorded(binding) {
    const slot = this.#slot
    if (slot !== undefined && !this.#asks(slot, binding, false)) {
      this.#apply(slot, binding)
    }
  }

  /**
   * Switches a binding to another form of it, unless that's taken, which asks first
   * @param {Slot} slot - Which binding
   * @param {string} flipped - Its other form
   * @returns {void}
   */
  #flip(slot, flipped) {
    if (!this.#asks(slot, flipped, true)) {
      this.#apply(slot, flipped)
    }
  }

  /**
   * Asks whether to replace another command's binding, if this one is taken. A switch that asks marks its binding as
   * the one being changed, without recording
   * @param {Slot} slot - Which binding it's for
   * @param {string} binding - The binding
   * @param {boolean} flip - Whether it came from switching a binding's form
   * @returns {boolean} Whether it's taken, and the question is shown
   */
  #asks(slot, binding, flip) {
    const store = this.#store
    const taken =
      store === undefined ? undefined : findConflict(store.entries(), { binding, except: slot.id, input: slot.input })
    if (taken === undefined) {
      return false
    }
    if (flip) {
      this.#stopRecording()
      this.#slot = slot
    }
    this.#conflict = { binding, flip, id: taken.commandId, label: taken.label, slot }
    this.#render()
    return true
  }

  /**
   * Puts a binding in its slot, and stops recording
   * @param {Slot} slot - Which binding
   * @param {string} binding - The binding
   * @returns {void}
   */
  #apply(slot, binding) {
    this.#stop()
    this.#put(slot, binding)
  }

  /**
   * Replaces the other command's binding: takes from that command any binding that's the same through the input,
   * whatever syntax either uses (one the input can't read is the same as nothing), and puts it in the slot
   * @returns {void}
   */
  #accept() {
    const conflict = this.#conflict
    if (conflict === undefined) {
      return
    }
    this.#stop()
    const { binding, id, slot } = conflict
    const { input } = slot
    const lists = this.#lists(id)
    if (lists !== undefined) {
      const lookup = bindingLookup(input, binding)
      /**
       * Whether one of the other command's bindings is the same as the one taken
       * @param {string} other - Its binding
       * @returns {boolean} Whether it is
       */
      const same = (other) => {
        try {
          return bindingLookup(input, other) === lookup
        } catch {
          return false
        }
      }
      this.#save(id, { ...lists, [input.field]: (lists[input.field] ?? []).filter((other) => !same(other)) })
    }
    this.#put(slot, binding)
  }

  /**
   * Leaves the other command's binding, and stops a switch that asked
   * @returns {void}
   */
  #cancel() {
    if (this.#conflict?.flip === true) {
      this.#stop()
    }
    this.#conflict = undefined
    this.#render()
  }

  /**
   * Puts a binding in its slot: in place of the one there, or added at the end
   * @param {Slot} slot - Which binding
   * @param {string} binding - The binding
   * @returns {void}
   */
  #put({ id, index, input }, binding) {
    const lists = this.#lists(id)
    if (lists !== undefined) {
      const list = lists[input.field] ?? []
      this.#save(id, { ...lists, [input.field]: index === undefined ? [...list, binding] : list.with(index, binding) })
    }
  }

  /**
   * Takes a binding away
   * @param {Slot} slot - Which binding
   * @returns {void}
   */
  #remove({ id, index, input }) {
    const lists = this.#lists(id)
    if (lists !== undefined && index !== undefined) {
      this.#save(id, { ...lists, [input.field]: (lists[input.field] ?? []).toSpliced(index, 1) })
    }
  }

  /**
   * Resets one command to its defaults, taking away its override
   * @param {string} id - The command
   * @returns {void}
   */
  #reset(id) {
    const store = this.#store
    if (store !== undefined) {
      store.save(overridesWithout(store, id))
      this.dispatchEvent(new CustomEvent('reset', { detail: { commandId: id } }))
    }
  }

  /**
   * Resets every command to its defaults
   * @returns {void}
   */
  #resetAll() {
    const store = this.#store
    if (store !== undefined) {
      store.save({})
      this.dispatchEvent(new CustomEvent('reset', { detail: {} }))
    }
  }

  /**
   * A command's bindings in the fields shown, if there's a store
   * @param {string} id - The command
   * @returns {Lists | undefined} Its bindings
   */
  #lists(id) {
    const store = this.#store
    return store === undefined ? undefined : listsOf(store, id, this.#inputs)
  }

  /**
   * Saves a command's bindings as the fields that differ from its defaults, or as none when nothing does, and says so
   * @param {string} id - The command
   * @param {Lists} lists - Its bindings
   * @returns {void}
   */
  #save(id, lists) {
    const store = this.#store
    if (store === undefined) {
      return
    }
    const defaults = store.defaults(id)
    if (defaults !== undefined) {
      const changed = Object.fromEntries(
        FIELDS.flatMap((field) => {
          const list = lists[field]
          const before = defaults[field] ?? []
          const same =
            list !== undefined && list.length === before.length && list.every((one, at) => one === before[at])
          return list === undefined || same ? [] : [[field, list]]
        }),
      )
      const rest = overridesWithout(store, id)
      store.save(Object.keys(changed).length === 0 ? rest : { ...rest, [id]: changed })
    }
    this.dispatchEvent(new CustomEvent('change', { detail: { bindings: lists, commandId: id } }))
  }

  /** @returns {void} */
  #render() {
    const store = this.#store
    if (store === undefined) {
      this.#dialog.replaceChildren()
      return
    }
    const header = make('div', { className: 'settings__header', part: 'header' })
    header.append(
      make('div', { className: 'settings__title', part: 'title', text: 'Keyboard Shortcuts' }),
      button({ className: 'settings__reset-all', part: 'reset-all', text: 'Reset All' }, () => {
        this.#resetAll()
      }),
    )
    // A group for each category, in the order the store first has them, of the rows that aren't hidden
    const rows = store.entries().filter(({ binding }) => binding.hidden !== true)
    const categories = [...new Set(rows.map(({ binding }) => categoryOf(binding)))]
    const groups = categories.map((category) => {
      const list = make('ul', { className: 'settings__list', part: 'list' })
      list.append(
        ...rows
          .filter(({ binding }) => categoryOf(binding) === category)
          .map(({ binding, id }) => this.#row(store, id, binding.label)),
      )
      const group = make('div', { className: 'settings__group', part: 'group' })
      group.append(make('div', { className: 'settings__group-title', part: 'group-title', text: category }), list)
      return group
    })
    this.#dialog.replaceChildren(header, ...groups)
  }

  /**
   * A row: the command's or axis's label, its bindings through the inputs that fit it (an axis's sources, or a
   * command's triggers), and its reset button. A new binding being recorded for it shows its prompt and question at
   * the end; while nothing is being recorded, the end has a button for each input that can be recorded now
   * @param {AnyBindingsStore} store - The store
   * @param {string} id - The command or axis
   * @param {string} label - Its label
   * @returns {HTMLLIElement} The row
   */
  #row(store, id, label) {
    const axis = store.defaults(id)?.axes !== undefined
    const inputs = this.#inputs.filter((input) => (input.axis === true) === axis)
    const lists = listsOf(store, id, inputs)
    const bindings = make('span', { className: 'settings__item-bindings', part: 'item-bindings' })
    bindings.append(
      ...inputs.flatMap((input) =>
        (lists[input.field] ?? []).map((binding, index) => this.#cell({ id, index, input }, binding)),
      ),
    )
    const slot = this.#slot
    if (slot === undefined) {
      const add = make('span', { className: 'settings__item-add', part: 'item-add' })
      for (const input of inputs) {
        if (input.record !== undefined && (input.available?.() ?? true)) {
          add.append(
            button({ className: '', part: `add-${input.label.toLowerCase()}`, text: `+ ${input.label}` }, () => {
              this.#record({ id, index: undefined, input })
            }),
          )
        }
      }
      bindings.append(add)
    } else if (slot.id === id && slot.index === undefined) {
      bindings.append(this.#prompt(slot.input), ...this.#question())
    }
    const item = make('li', { className: 'settings__item', part: 'item' })
    item.append(
      make('span', { className: 'settings__item-label', part: 'item-label', text: label }),
      bindings,
      button({ className: 'settings__item-reset', part: 'item-reset', text: 'Reset' }, () => {
        this.#reset(id)
      }),
    )
    return item
  }

  /**
   * A binding as shown in its row: its chip, or the prompt while it's recorded again, or only the question while a
   * switch to it waits on one
   * @param {Slot} slot - Which binding
   * @param {string} binding - The binding
   * @returns {HTMLSpanElement} What's shown
   */
  #cell(slot, binding) {
    const recording = this.#slot
    if (recording?.id === slot.id && recording.input === slot.input && recording.index === slot.index) {
      const cell = this.#conflict?.flip === true ? recordingBox() : this.#prompt(slot.input)
      cell.append(...this.#question())
      return cell
    }
    return this.#chip(slot, binding)
  }

  /**
   * A binding's chip: its display parts as `<kbd>`s, which start recording it again when clicked; what it can be
   * switched to (inverted, for inputs whose bindings can be, and its release or press form, while releases are on and
   * it has one); and a button that removes it
   * @param {Slot} slot - Which binding
   * @param {string} binding - The binding
   * @returns {HTMLSpanElement} The chip
   */
  #chip(slot, binding) {
    const { input } = slot
    const keys = make('span', { className: 'settings__binding-keys', part: 'binding-keys' })
    keys.append(
      ...formatBinding(input, binding).map((part) =>
        make('kbd', { className: 'settings__binding-key', part: 'binding-key', text: part }),
      ),
    )
    keys.addEventListener('click', () => {
      this.#record(slot)
    })
    const trimmed = binding.trim()
    /** @type {HTMLButtonElement[]} */
    const switches = []
    if (input.invert === true) {
      const inverted = trimmed.startsWith('-')
      switches.push(
        toggle(
          { className: 'settings__binding-release', label: 'Invert', name: 'binding-invert', on: inverted },
          () => {
            this.#flip(slot, inverted ? trimmed.slice('-'.length) : `-${trimmed}`)
          },
        ),
      )
    }
    const isRelease = splitRelease(binding.toLowerCase()).release
    if (this.releases && input.release !== undefined && (isRelease || input.release(binding))) {
      switches.push(
        toggle(
          { className: 'settings__binding-release', label: 'Release', name: 'binding-release', on: isRelease },
          () => {
            this.#flip(slot, flipRelease(binding))
          },
        ),
      )
    }
    const chip = make('span', { className: 'settings__binding', part: 'binding' })
    chip.append(
      keys,
      ...switches,
      button({ className: 'settings__binding-remove', part: 'binding-remove', text: '×' }, () => {
        this.#remove(slot)
      }),
    )
    return chip
  }

  /**
   * What's shown while a binding is recorded: what to do, or the steps so far, and the switches for what to record (a
   * release, or a hold and a tap, instead of a press, or several steps, and Done once there are steps)
   * @param {InputUI} input - The input being recorded
   * @returns {HTMLSpanElement} The prompt
   */
  #prompt(input) {
    const steps = this.#steps
    const suffix = this.#suffix
    const text =
      steps.length > 0
        ? `${formatBinding(input, steps.join(' ')).join(' ')} then...`
        : (input.prompt?.(suffix === RELEASE_SUFFIX) ?? 'Waiting...')
    /**
     * A switch for capturing one suffix
     * @param {string} label - Its label
     * @param {string} name - Its name
     * @param {string} which - The suffix
     * @returns {HTMLButtonElement} The switch
     */
    const captures = (label, name, which) =>
      promptSwitch(label, name, suffix === which, () => {
        this.#capture(which)
      })
    const prompt = recordingBox()
    prompt.append(
      make('span', { className: 'settings__recording-overlay', part: 'recording-overlay', text }),
      ...(input.release !== undefined && this.releases ? [captures('Release', 'release', RELEASE_SUFFIX)] : []),
      ...(input.release !== undefined && this.holds
        ? [captures('Hold', 'hold', ':hold'), captures('Tap', 'tap', ':tap')]
        : []),
      ...(this.sequences && input.axis !== true
        ? [
            promptSwitch('Steps', 'sequence', this.#sequence, () => {
              this.#toggleSteps()
            }),
          ]
        : []),
      ...(steps.length > 0
        ? [
            promptSwitch('Done', 'done', false, () => {
              this.#finish()
            }),
          ]
        : []),
    )
    return prompt
  }

  /**
   * The question about a taken binding, if there is one: replace the other command's, or cancel
   * @returns {HTMLSpanElement[]} The question, or nothing
   */
  #question() {
    const conflict = this.#conflict
    if (conflict === undefined) {
      return []
    }
    const question = make('span', {
      className: 'settings__conflict',
      part: 'conflict',
      text: `Already bound to "${conflict.label}". `,
    })
    question.append(
      button({ className: '', part: 'conflict-accept', text: 'Replace' }, () => {
        this.#accept()
      }),
      button({ className: '', part: 'conflict-cancel', text: 'Cancel' }, () => {
        this.#cancel()
      }),
    )
    return [question]
  }
}

export { KeybindSettings }
