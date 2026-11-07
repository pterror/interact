// Legacy: part of the listbox as it was before extensions, kept only while the menu, palette and combobox run on it.
// It goes when they are rebuilt (docs/design.md); new code uses the listbox's extensions instead.
/**
 * A list focus moves in: its items, and which of them focus passes over.
 * @template T
 * @typedef {Readonly<{ items: Readonly<{ count: number, item: (position: number) => T | undefined }>, skip: (item: T) => boolean }>} Landable
 */

/**
 * The first position from `from` on, stepping by `step`, that focus can rest on.
 * @template T
 * @param {Landable<T>} list - The list
 * @param {number} from - Where to start
 * @param {number} step - 1 forward, -1 back
 * @returns {number | undefined} The position, if there is one before the end
 */
function scan({ items, skip }, from, step) {
  const { count } = items
  for (let at = from; at >= 0 && at < count; at += step) {
    const item = items.item(at)
    if (item === undefined || !skip(item)) {
      return at
    }
  }
  return undefined
}

/**
 * The position nearest `position` that focus can rest on, looking toward `direction` first and then back the other
 * way: never an item `skip` passes over (a menu's separator); an item not read yet may be, since nothing is known of
 * it, so a run of skipped items never costs more than the items already read.
 * @template T
 * @param {Landable<T>} list - The list
 * @param {number} position - Where to start
 * @param {number} direction - Which way to look first: 1 forward, -1 back
 * @returns {number | undefined} The position, if any item can take focus
 */
function landing(list, position, direction) {
  return scan(list, position, direction) ?? scan(list, position - direction, -direction)
}

export { landing }
