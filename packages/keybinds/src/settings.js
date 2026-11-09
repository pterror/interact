/**
 * A ready-made settings panel, wired from small pieces: a row per id not hidden, grouped by category under a header
 * row, with its bindings through each input (an axis's through the axis input, a command's through the others); a
 * binding is recorded from what is done next, asks before taking another id's, and can be removed; an id, or all,
 * resets to its defaults. Each edit is one write to the overrides, of only the fields that differ. Unstyled, in the
 * light DOM: a Reset all button (`data-keybinds=reset-all`), then the groups (`role=group`, labelled by their
 * header); each piece names itself in `data-keybinds`. It is no overlay: an app shows it in its own dialog. An app
 * that wants one piece otherwise wires the rest itself: settingsKeys() (which ids), settingsRow() (a row),
 * settingsChip(), settingsPrompt(), settingsQuestion() (its parts), rebind() (the edits), conflictQuestion() (asking),
 * recording() and settingsRecorder() (recording), categoryHeaders(), the inputs (rebindKeys(), ...), with list's
 * render and groupMount.
 */

import { groupMount, render } from '@pterror/interact-list'

import { categoryHeaders } from './category-headers.js'
import { conflictQuestion } from './conflict-question.js'
import { rebind } from './rebind.js'
import { recording } from './recording.js'
import { settingsChip } from './settings-chip.js'
import { settingsKeys } from './settings-keys.js'
import { settingsPrompt } from './settings-prompt.js'
import { settingsQuestion } from './settings-question.js'
import { settingsRecorder } from './settings-recorder.js'
import { settingsRow } from './settings-row.js'
import { splitBinding } from './split-binding.js'

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/**
 * @typedef {Readonly<{ label: string, category?: string, hidden?: boolean, keys?: readonly string[],
 *   mouse?: readonly string[], pad?: readonly string[], axes?: readonly string[] }>} Entry
 */

/**
 * @typedef {Readonly<Record<string, Readonly<{ keys?: readonly string[], mouse?: readonly string[],
 *   pad?: readonly string[], axes?: readonly string[] }>>>} Overrides
 */

/**
 * @typedef {Readonly<{ done: (binding: string) => void, release: boolean, ignore: (event: Event) => boolean }>}
 *   RecordOptions
 */

/**
 * One input, as rebindKeys() and the others give it
 * @typedef {Readonly<{
 *   field: Field,
 *   label: string,
 *   prompt: (release: boolean) => string,
 *   record: (options: RecordOptions) => () => void,
 *   lookup: (binding: string) => string,
 *   parts: (binding: string) => readonly string[],
 *   available?: () => boolean,
 *   watch?: (listener: () => void) => () => void,
 * }>} Input
 */

/** @typedef {Readonly<{ id: string, field: Field, index?: number | undefined }>} Slot */

/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   schema: Readonly<Record<string, Entry>>,
 *   overrides: Readonly<{ get: () => Overrides, watch: (listener: () => void) => () => void,
 *     set: (overrides: Overrides) => void }>,
 *   inputs: readonly Input[],
 *   releases?: boolean,
 *   holds?: boolean,
 *   sequences?: boolean,
 *   pause?: number,
 * }>} SettingsOptions
 */

let made = 0

/**
 * Whether an event happened in a prompt, whose switches aren't recorded
 * @param {Event} event - The event
 * @returns {boolean} Whether it did
 */
function inPrompt(event) {
  return event.composedPath().some((node) => node instanceof HTMLElement && node.dataset['keybinds'] === 'prompt')
}

/**
 * Builds a settings panel in an element
 * @param {SettingsOptions} options - Its element; the schema; a person's overrides (bindingStore()); the inputs shown
 *   and recorded (rebindKeys(), rebindMouse(), rebindPad(), rebindAxes()); which syntax can be recorded, as
 *   keybinds() has it on: releases (":up"), holds (":hold", ":tap"), sequences ("g i"); and how long a pause takes
 *   the steps so far, as for recording()
 * @returns {() => void} Stopping, and taking out what it put in the element
 * @example
 * const stop = settings({ element, inputs: [rebindKeys(), rebindMouse()], overrides, schema })
 */
function settings({ element, holds, inputs, overrides, pause, releases, schema, sequences }) {
  made += 1
  const edits = rebind({ overrides, schema })
  /** @type {(field: Field) => Input | undefined} */
  const inputOf = (field) => inputs.find((input) => input.field === field)
  /** @type {(field: Field) => (binding: string) => string} */
  const lookupOf = (field) => inputOf(field)?.lookup ?? ((binding) => binding)
  const question = conflictQuestion({ bindings: edits.bindings, lookupOf, put: edits.put, replace: edits.replace })
  const recorded = recording({
    done: question.offer,
    takesSuffix(slot, binding) {
      try {
        lookupOf(slot.field)(splitBinding(binding).suffix === '' ? `${binding}:up` : binding)
        return true
      } catch {
        return false
      }
    },
    ...(pause === undefined ? {} : { pause }),
  })
  /** @type {(slot: Slot) => void} */
  const record = (slot) => {
    question.cancel()
    recorded.start(slot)
  }
  /** @type {(slot: Slot, binding: string) => readonly string[]} */
  const parts = (slot, binding) => inputOf(slot.field)?.parts(binding) ?? [binding]
  const keys = settingsKeys(schema)
  const headers = categoryHeaders({
    categoryOf: keys.groupOf,
    drawn: keys,
    prefix: `keybinds-settings-${String(made)}`,
  })
  const groups = document.createElement('div')
  const resetAll = document.createElement('button')
  resetAll.type = 'button'
  resetAll.dataset['keybinds'] = 'reset-all'
  resetAll.textContent = 'Reset all'
  resetAll.addEventListener('click', edits.resetAll)
  element.append(resetAll, groups)
  const rendered = render({
    create: (key) => headers.header(key) ?? document.createElement('div'),
    drawn: headers.drawn,
    facets: [
      settingsRow({
        ask: settingsQuestion({
          accept: question.accept,
          cancel: question.cancel,
          labelOf: (id) => schema[id]?.label ?? id,
        }),
        changed: edits.changed,
        chip: settingsChip({ offer: question.offer, parts, record, remove: edits.remove }),
        entryOf: (id) => {
          const entry = schema[id]
          return entry === undefined ? undefined : { ...edits.bindings.get()[id], label: entry.label }
        },
        inputsOf: (id) => inputs.filter((input) => (input.field === 'axes') === (schema[id]?.axes !== undefined)),
        prompt: settingsPrompt({
          parts,
          prompt: (slot, release) => inputOf(slot.field)?.prompt(release) ?? '',
          recording: recorded,
          ...(holds === undefined ? {} : { holds }),
          ...(releases === undefined ? {} : { releases }),
          ...(sequences === undefined ? {} : { sequences }),
        }),
        question,
        record,
        recording: recorded,
        reset: edits.reset,
        watch(listener) {
          const stops = [edits.bindings.watch(listener), ...inputs.flatMap((input) => input.watch?.(listener) ?? [])]
          return () => {
            for (const stop of stops) {
              stop()
            }
          }
        },
      }),
    ],
    mount: groupMount({ container: groups, groupOf: headers.groupOf, labelIdOf: headers.labelIdOf }),
  })
  const stopRecorder = settingsRecorder({
    ignore: inPrompt,
    recordOf: (slot) => inputOf(slot.field)?.record,
    recording: recorded,
  })
  return () => {
    recorded.stop()
    stopRecorder()
    rendered.stop()
    resetAll.remove()
    groups.remove()
  }
}

export { settings }
