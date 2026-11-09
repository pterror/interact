/**
 * A settings panel row's contents, as a facet: the id's label; its bindings through each of its inputs (a chip each,
 * or the prompt in place of the one being recorded, and the question after the slot it is about), then the prompt
 * and question for a new binding; a button per input that can be recorded now, which records a new one ("+ Key",
 * `data-keybinds=add`), left out while the row records; and Reset (`data-keybinds=reset`, `aria-disabled` while
 * nothing differs). A row whose bindings differ from its defaults is `data-changed`. Header rows are left as they
 * were made.
 */

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/** @typedef {Readonly<{ id: string, field: Field, index?: number | undefined }>} Slot */

/** @typedef {Readonly<{ category: string }>} Header */

/**
 * @typedef {Readonly<{ label: string, keys?: readonly string[], mouse?: readonly string[],
 *   pad?: readonly string[], axes?: readonly string[] }>} Entry
 */

/** @typedef {Readonly<{ field: Field, label: string, available?: () => boolean }>} Input */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @template {Readonly<{ slot: Slot }>} R, Q
 * @typedef {Readonly<{
 *   entryOf: (id: string) => Entry | undefined,
 *   inputsOf: (id: string) => readonly Input[],
 *   changed: (id: string) => boolean,
 *   recording: Watched<R | undefined>,
 *   question: Watched<(Q & Readonly<{ slot: Slot }>) | undefined>,
 *   chip: (slot: Slot, binding: string) => Element,
 *   prompt: (recorded: R) => Element,
 *   ask: (question: Q) => Element,
 *   record: (slot: Slot) => void,
 *   reset: (id: string) => void,
 *   watch: (listener: () => void) => () => void,
 * }>} SettingsRowOptions
 */

/**
 * Whether two slots are the same
 * @param {Slot | undefined} one - A slot
 * @param {Slot} other - Another
 * @returns {boolean} Whether they are
 */
function same(one, other) {
  return one?.id === other.id && one.field === other.field && one.index === other.index
}

/**
 * Hearing the rows a Watched of something in a slot is about, as it changes: the one it was in, and the one it is in
 * @param {Watched<Readonly<{ slot: Slot }> | undefined>} watched - The Watched
 * @param {(ids: readonly string[]) => void} listener - Hears the rows
 * @returns {() => void} Stopping
 */
function rowsOf(watched, listener) {
  let was = watched.get()?.slot.id
  return watched.watch(() => {
    const now = watched.get()?.slot.id
    listener([...new Set([was, now].filter((id) => id !== undefined))])
    was = now
  })
}

/**
 * A button
 * @param {string} name - Its `data-keybinds`
 * @param {string} text - Its text
 * @param {() => void} click - What it does
 * @returns {HTMLButtonElement} The button
 */
function button(name, text, click) {
  const made = document.createElement('button')
  made.type = 'button'
  made.dataset['keybinds'] = name
  made.textContent = text
  made.addEventListener('click', click)
  return made
}

/**
 * Fills rows
 * @template {Readonly<{ slot: Slot }>} R, Q
 * @param {SettingsRowOptions<R, Q>} options - An id's bindings in effect (and label); its inputs; whether its
 *   bindings differ from its defaults; what is being recorded (recording()); the question asked (conflictQuestion());
 *   a binding's chip, the prompt and the question as elements; recording a slot; resetting an id; and hearing what
 *   every row shows change
 * @returns {Readonly<{ apply: (key: string | Header, element: Element) => void,
 *   watch: (listener: (keys?: readonly (string | Header)[]) => void) => () => void }>} The facet
 */
function settingsRow({ ask, changed, chip, entryOf, inputsOf, prompt, question, record, recording, reset, watch }) {
  return {
    apply(key, element) {
      const entry = typeof key === 'string' ? entryOf(key) : undefined
      if (typeof key !== 'string' || entry === undefined) {
        return
      }
      const recorded = recording.get()
      const asked = question.get()
      /** @type {(slot: Slot, binding?: string) => Element[]} */
      const at = (slot, binding) => [
        ...(recorded !== undefined && same(recorded.slot, slot)
          ? [prompt(recorded)]
          : binding === undefined
            ? []
            : [chip(slot, binding)]),
        ...(asked !== undefined && same(asked.slot, slot) ? [ask(asked)] : []),
      ]
      const inputs = inputsOf(key)
      const bindings = document.createElement('span')
      bindings.dataset['keybinds'] = 'bindings'
      bindings.append(
        ...inputs.flatMap(({ field }) =>
          (entry[field] ?? []).flatMap((binding, index) => at({ field, id: key, index }, binding)),
        ),
        ...inputs.flatMap(({ field }) => at({ field, id: key })),
      )
      const adds =
        recorded?.slot.id === key
          ? []
          : inputs
              .filter((input) => input.available?.() ?? true)
              .map(({ field, label }) =>
                button('add', `+ ${label}`, () => {
                  record({ field, id: key })
                }),
              )
      const label = document.createElement('span')
      label.textContent = entry.label
      const differs = changed(key)
      const resetting = button('reset', 'Reset', () => {
        reset(key)
      })
      resetting.setAttribute('aria-disabled', String(!differs))
      element.toggleAttribute('data-changed', differs)
      element.replaceChildren(label, bindings, ...adds, resetting)
    },
    watch(listener) {
      const stops = [
        watch(() => {
          listener()
        }),
        rowsOf(recording, listener),
        rowsOf(question, listener),
      ]
      return () => {
        for (const stop of stops) {
          stop()
        }
      }
    },
  }
}

export { settingsRow }
