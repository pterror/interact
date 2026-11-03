/**
 * @import { Source } from '@interact/core/source'
 * @import { ListboxOptions } from './listbox.js'
 */

const DEFAULT_ROWS = 10

/**
 * The options for what is typed, at once or later: the app's (or its server's) to find, `undefined` for none.
 * @template T, F
 * @typedef {(text: string) => Source<T, F> | undefined | Promise<Source<T, F> | undefined>} Suggest
 */

/**
 * What every combobox has: its id (unique in the page for light DOM), its accessible name, what a select-only one
 * shows with nothing chosen, how many options show at once, the clock typing is timed by, what an option is called,
 * and the option chosen to start with.
 * @template T
 * @typedef {Readonly<{
 *   id?: string,
 *   label?: string,
 *   placeholder?: string,
 *   rows?: number,
 *   now?: () => number,
 *   text?: (item: T) => string,
 *   value?: T,
 * }>} ComboboxBasics
 */

/**
 * How a combobox starts. Select-only: a button-like field and a fixed list of options, found by typing their first
 * letters. Editable without autocomplete: a text field over a fixed list. Editable with `list` autocomplete: the options
 * are what `suggest` finds for the text; with `both`, the active option's text also completes the field inline. List
 * autocomplete makes the first option found active itself (`automatic`) or waits for the arrows (`manual`); `both` is
 * always automatic. `clearOnEscape`: Escape with the list closed empties the field (by default it does).
 * @template T, F
 * @typedef {(ComboboxBasics<T> & Readonly<{ kind: 'select-only', source?: Source<T, F> }>)
 *   | (ComboboxBasics<T> & Readonly<{
 *     kind: 'editable', autocomplete?: 'none', source?: Source<T, F>, clearOnEscape?: boolean,
 *   }>)
 *   | (ComboboxBasics<T> & Readonly<{
 *     kind: 'editable',
 *     autocomplete: 'list' | 'both',
 *     suggest: Suggest<T, F>,
 *     selection?: 'manual' | 'automatic',
 *     clearOnEscape?: boolean,
 *   }>)} ComboboxOptions
 */

/**
 * What kind of combobox the options make: whether its field is editable, how it autocompletes, whether leaving with
 * its list open chooses the active option (select-only, `automatic`, `both`), whether Escape empties it, and what it
 * suggests from, if it suggests.
 * @template T, F
 * @typedef {Readonly<{
 *   editable: boolean,
 *   autocomplete: 'none' | 'list' | 'both',
 *   selectsOnLeave: boolean,
 *   clearsOnEscape: boolean,
 *   suggest: Suggest<T, F> | undefined,
 * }>} ComboboxKind
 */

/**
 * What kind of combobox options make.
 * @template T, F
 * @param {ComboboxOptions<T, F>} options - The options
 * @returns {ComboboxKind<T, F>} The kind
 */
function kindOf(options) {
  if (options.kind === 'select-only') {
    return { autocomplete: 'none', clearsOnEscape: false, editable: false, selectsOnLeave: true, suggest: undefined }
  }
  const clearsOnEscape = options.clearOnEscape ?? true
  if (!('suggest' in options)) {
    return { autocomplete: 'none', clearsOnEscape, editable: true, selectsOnLeave: false, suggest: undefined }
  }
  const automatic = options.autocomplete === 'both' || options.selection === 'automatic'
  return {
    autocomplete: options.autocomplete,
    clearsOnEscape,
    editable: true,
    selectsOnLeave: automatic,
    suggest: options.suggest,
  }
}

/**
 * The fixed options a combobox starts with, if it has them: none for one that suggests.
 * @template T, F
 * @param {ComboboxOptions<T, F>} options - Its options
 * @returns {Source<T, F> | undefined} The source
 */
function sourceOf(options) {
  return 'source' in options ? options.source : undefined
}

/**
 * The list a combobox's options are in: it selects nothing, and its active option is the one the field names.
 * @template T, F
 * @param {ComboboxOptions<T, F>} options - The combobox's options
 * @param {string} id - The combobox's id
 * @returns {ListboxOptions<T, F>} The list's
 */
function listOptions(options, id) {
  const source = sourceOf(options)
  return {
    id: `${id}-option`,
    label: options.label ?? '',
    mode: 'none',
    rows: options.rows ?? DEFAULT_ROWS,
    ...(source === undefined ? {} : { source }),
    ...(options.text === undefined ? {} : { text: options.text }),
    ...(options.now === undefined ? {} : { now: options.now }),
  }
}

export { kindOf, listOptions }
