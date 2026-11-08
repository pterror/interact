/**
 * The worldbuilding overview: a hundred thousand top-level entries, every third a region, each region's members cut
 * at three, nested three levels deep, with "+N more" tiles, a region that contains itself (cut where it recurs) and an
 * entry in two regions. Answered by an in-memory stand-in for the server that works members out from ids rather than
 * storing them, drawn only near what is in view, wired by hand from `@interact/list`, for the browser test.
 */

import {
  activeDescendant,
  byEntry,
  cell,
  content,
  drag,
  edgeScroll,
  flowMount,
  gaps,
  ids,
  items,
  keepInPlace,
  mark,
  measure,
  measuredRows,
  move,
  nest,
  pick,
  place,
  posInSet,
  render,
  reveal,
  sizer,
  treeCache,
  viewport,
  visibleRanks,
  windowing,
} from '@interact/list'
import { keybinds, keys } from 'keybinds'

const TOPS = 100_000
const FEW = 3
const SHARED = 'Shared'
const MORE = '+'

/**
 * An occurrence in the overview as the server answers it
 * @typedef {Readonly<{ key: string, entry: string | undefined, kind: 'entry' | 'region' | 'repeat' | 'more',
 *   label: string, children?: readonly Occurrence[] }>} Occurrence
 */

/**
 * A drag under way
 * @typedef {Readonly<{ key: string, target: string, after: boolean }>} Dragging
 */

/**
 * What the overview shows now
 * @typedef {Readonly<{ active: string | undefined, depth: number, inView: boolean, selected: number,
 *   drawnTop: number, drawn: number, position: string | undefined, focused: boolean }>} OverviewSeen
 */

/** @type {Map<string, readonly string[]>} */
const edited = new Map()
/** @type {Set<() => void>} */
const changed = new Set()

/**
 * The number of a top-level entry
 * @param {string} id - Its id, "E" and a number
 * @returns {number | undefined} Its number
 */
function topNumber(id) {
  return /^E\d+$/u.test(id) ? Number(id.slice(1)) : undefined
}

/**
 * Whether an entry is a region
 * @param {string} id - The entry
 * @returns {boolean} Whether it has members
 */
function isRegion(id) {
  const top = topNumber(id)
  if (top !== undefined) {
    return top % 3 === 0
  }
  return /^M\d+\.0$/u.test(id)
}

/**
 * A region's members, worked out from its id unless edited
 * @param {string} id - The region
 * @returns {readonly string[]} Its members in order
 */
function membersOf(id) {
  const kept = edited.get(id)
  if (kept !== undefined) {
    return kept
  }
  const top = topNumber(id)
  if (top !== undefined) {
    const count = 4 + (top % 5)
    return Array.from({ length: count }, (_, index) => (index === 2 ? SHARED : `M${String(top)}.${String(index)}`))
  }
  const owner = /^M(?<top>\d+)\.0$/u.exec(id)?.groups?.['top']
  if (owner === undefined) {
    return []
  }
  return Array.from({ length: 5 }, (_, index) => (index === 1 ? `E${owner}` : `${id}.${String(index)}`))
}

/**
 * How an entry is called
 * @param {string} id - The entry
 * @returns {string} Its name
 */
function labelOf(id) {
  if (id === SHARED) {
    return 'Shared entry'
  }
  const top = topNumber(id)
  const name = top === undefined ? id : String(top)
  return `${isRegion(id) ? 'Region' : 'Entry'} ${name}`
}

/**
 * An occurrence and what the server shows under it
 * @param {string} key - The occurrence
 * @param {string} id - Its entry
 * @param {ReadonlySet<string>} above - The regions it is inside
 * @returns {Occurrence} It, cut short
 */
function occurrence(key, id, above) {
  if (above.has(id)) {
    return { entry: id, key, kind: 'repeat', label: `${labelOf(id)} (shown above)` }
  }
  if (!isRegion(id)) {
    return { entry: id, key, kind: 'entry', label: labelOf(id) }
  }
  const inside = new Set(above).add(id)
  const all = membersOf(id)
  const children = all.slice(0, FEW).map((member) => occurrence(`${key}/${member}`, member, inside))
  const more = all.length - FEW
  /** @type {readonly Occurrence[]} */
  const tile =
    more > 0 ? [{ entry: undefined, key: `${key}/${MORE}`, kind: 'more', label: `+${String(more)} more` }] : []
  return { children: [...children, ...tile], entry: id, key, kind: 'region', label: labelOf(id) }
}

/**
 * A top-level entry's occurrence
 * @param {number} rank - Its rank
 * @returns {Occurrence} It, cut short
 */
function topAt(rank) {
  const id = `E${String(rank)}`
  return occurrence(id, id, new Set())
}

/**
 * An occurrence and everything under it, in reading order
 * @param {Occurrence} node - The occurrence
 * @returns {string[]} Their keys
 */
function readingOrder(node) {
  return [node.key, ...(node.children ?? []).flatMap((child) => readingOrder(child))]
}

/**
 * The top-level rank of an occurrence
 * @param {string} key - The occurrence
 * @returns {number | undefined} Its top-level entry's rank
 */
function rankOf(key) {
  const top = topNumber(key.split('/')[0] ?? '')
  return top !== undefined && top < TOPS ? top : undefined
}

/**
 * The entry an occurrence shows
 * @param {string} key - The occurrence
 * @returns {string | undefined} Its entry; none for a "+N more" tile
 */
function entryOf(key) {
  const last = key.split('/').at(-1) ?? ''
  return last.startsWith(MORE) ? undefined : last
}

/**
 * The server's answer: top-level occurrences from one rank up to another, each cut short
 * @param {number} from - The first rank
 * @param {number} to - Past the last
 * @returns {Promise<readonly Occurrence[]>} The occurrences
 */
function overview(from, to) {
  return Promise.resolve(
    Array.from({ length: Math.max(Math.min(to, TOPS) - Math.max(from, 0), 0) }, (_, index) =>
      topAt(Math.max(from, 0) + index),
    ),
  )
}

/**
 * The server's answer: the occurrence `by` places on in reading order, across regions and top-level entries
 * @param {string | undefined} from - Where to start; none for an end
 * @param {number} by - How far
 * @returns {Promise<string | undefined>} The occurrence
 */
function step(from, by) {
  if (from === undefined) {
    return Promise.resolve(by < 0 ? readingOrder(topAt(TOPS - 1)).at(-1) : topAt(0).key)
  }
  let key = from
  for (let left = Math.abs(by); left > 0; left -= 1) {
    const rank = rankOf(key) ?? 0
    const order = readingOrder(topAt(rank))
    const index = order.indexOf(key) + Math.sign(by)
    if (index >= 0 && index < order.length) {
      key = order[index] ?? key
    } else if (by > 0 && rank + 1 < TOPS) {
      key = topAt(rank + 1).key
    } else if (by < 0 && rank > 0) {
      key = readingOrder(topAt(rank - 1)).at(-1) ?? key
    }
  }
  return Promise.resolve(key)
}

/**
 * The region an occurrence is shown in
 * @param {string} key - The occurrence
 * @returns {string | undefined} The region's entry; none at the top level
 */
function parentOf(key) {
  const parts = key.split('/')
  return parts.length < 2 ? undefined : parts.at(-2)
}

/**
 * The server's answer to a drop: an entry moved next to another occurrence, into its region, or first into the region
 * whose own card it was dropped on
 * @param {string} key - The occurrence dragged
 * @param {string} target - The occurrence dropped on
 * @param {boolean} after - Whether after it
 * @returns {void}
 */
function reorder(key, target, after) {
  const entry = entryOf(key)
  const from = parentOf(key)
  const targetEntry = entryOf(target)
  const into =
    targetEntry !== undefined && isRegion(targetEntry) && !target.includes(`/${targetEntry}/`)
      ? targetEntry
      : parentOf(target)
  if (
    entry === undefined ||
    from === undefined ||
    into === undefined ||
    target.startsWith(`${key}/`) ||
    key === target
  ) {
    return
  }
  edited.set(
    from,
    membersOf(from).filter((each) => each !== entry),
  )
  const rest = membersOf(into).filter((each) => each !== entry)
  let at = FEW
  if (into === targetEntry) {
    at = 0
  } else if (targetEntry !== undefined) {
    at = rest.indexOf(targetEntry) + (after ? 1 : 0)
  }
  edited.set(into, [...rest.slice(0, at), entry, ...rest.slice(at)])
  for (const listener of changed) {
    listener()
  }
}

/**
 * A key's element id
 * @param {string} key - The occurrence
 * @returns {string} Its id
 */
function idOf(key) {
  return `occurrence-${key.replaceAll(/[^a-z0-9]/giu, (character) => `_${String(character.codePointAt(0))}_`)}`
}

/**
 * A test that holds for keys a drag marks
 * @param {Readonly<{ get: () => Dragging | undefined, watch: (listener: () => void) => () => void }>} dragging - The
 *   drag
 * @param {(drag: Dragging, key: string) => boolean} holds - Whether it holds for a key
 * @returns {Readonly<{ has: (key: string) => boolean, watch: (listener: () => void) => () => void }>} The test
 */
function dragTest(dragging, holds) {
  return {
    has(key) {
      const at = dragging.get()
      return at !== undefined && holds(at, key)
    },
    watch: (listener) =>
      dragging.watch(() => {
        listener()
      }),
  }
}

/**
 * A command that starts something that finishes later
 * @param {string} id - The command
 * @param {string} key - Its key
 * @param {() => Promise<void>} run - What it does
 * @returns {import('keybinds').Command} The command
 */
function later(id, key, run) {
  return {
    execute: () => {
      void run()
    },
    id,
    keys: [key],
    label: id,
  }
}

/** @type {HTMLElement | undefined} */
let tree = undefined

/**
 * Puts the overview in the page
 * @returns {void}
 */
function putOverview() {
  const scroller = document.createElement('div')
  scroller.style.cssText = 'width: 480px; height: 600px; overflow: auto; overflow-anchor: none'
  const box = document.createElement('div')
  box.setAttribute('role', 'tree')
  box.setAttribute('aria-label', 'Overview')
  box.tabIndex = 0
  scroller.append(box)
  document.body.append(scroller)
  tree = box
  /** @type {typeof cell<string | undefined>} */
  const keyCell = cell
  const active = keyCell(undefined)
  const selectedEntry = keyCell(undefined)
  /** @type {typeof cell<Dragging | undefined>} */
  const dragCell = cell
  const dragging = dragCell(undefined)
  /** @type {typeof treeCache<string, Occurrence>} */
  const occurrences = treeCache
  const cache = occurrences({
    changes: {
      watch(listener) {
        changed.add(listener)
        return () => {
          changed.delete(listener)
        }
      },
    },
    fetch: overview,
    locate: (/** @type {string} */ key) => Promise.resolve(rankOf(key)),
  })
  const layout = measuredRows(56)
  const count = { get: () => TOPS, watch: () => () => undefined }
  const shown = viewport(scroller)
  const drawn = windowing({
    keep: {
      get() {
        const key = active.get()
        const top = key?.split('/')[0]
        return top === undefined ? [] : [top]
      },
      watch: (listener) => active.watch(listener),
    },
    keysAt: cache,
    locate: cache.locate,
    ranks: visibleRanks({ count, layout, visible: shown }),
  })
  sizer({ count, element: box, layout })
  keepInPlace({
    anchor() {
      const top = active.get()?.split('/')[0]
      const rank = top === undefined ? undefined : drawn.rank(top)
      return rank === undefined ? undefined : layout.place(rank).y
    },
    scrollBy: shown.scrollBy,
    shifts: layout,
    visible: shown,
  })

  /**
   * An occurrence's element: a treeitem, holding its region's members in a group
   * @param {string} key - The occurrence
   * @returns {Element} The element
   */
  const create = (key) => {
    const node = cache.node(key)
    const item = document.createElement('div')
    item.setAttribute('role', 'treeitem')
    item.style.cssText = 'user-select: none; padding: 2px 0'
    const head = document.createElement('div')
    head.id = `${idOf(key)}-head`
    head.style.cssText = node?.kind === 'more' ? 'font-style: italic' : 'border: 1px solid; padding: 4px'
    item.append(head)
    if (node?.children !== undefined) {
      item.setAttribute('aria-expanded', 'true')
      const group = document.createElement('div')
      group.setAttribute('role', 'group')
      group.style.paddingLeft = '20px'
      item.append(group)
    }
    return item
  }

  /** @type {ReturnType<typeof items<string>>} */
  const all = items()
  /** @type {import('@interact/list/render').Facet<string>[]} */
  const facets = []
  const nested = nest((/** @type {string} */ key, /** @type {Element} */ element) => {
    const group = element.querySelector(':scope > [role=group]')
    if (group === null) {
      return undefined
    }
    const inner = render({ create, drawn: cache.children(key), facets, mount: flowMount(group) })
    return inner.stop
  })
  facets.push(
    ids(idOf),
    content({
      changes: { watch: cache.watchNodes },
      show(key, element) {
        const head = element.firstElementChild
        if (head !== null) {
          head.textContent = cache.node(key)?.label ?? ''
        }
      },
    }),
    activeDescendant({ active, element: box, idOf }),
    all,
    mark({ attribute: 'data-active', on: '', test: active }),
    mark({ attribute: 'aria-selected', on: 'true', test: byEntry({ entryOf, test: selectedEntry }) }),
    mark({ attribute: 'data-dragging', on: '', test: dragTest(dragging, (at, key) => at.key === key) }),
    mark({
      attribute: 'data-drop-after',
      on: '',
      test: dragTest(dragging, (at, key) => at.target === key && at.after),
    }),
    mark({
      attribute: 'data-drop-before',
      on: '',
      test: dragTest(dragging, (at, key) => at.target === key && !at.after),
    }),
    reveal(active),
    nested,
  )
  render({
    create,
    drawn,
    facets: [
      ...facets,
      place({ layout, rank: drawn }),
      posInSet({ count, position: drawn }),
      measure({ measure: layout.measure, rank: drawn }),
    ],
    mount: flowMount(box),
  })
  pick({
    element: box,
    itemOf: all.itemOf,
    to: (key) => {
      active.set(key)
      selectedEntry.set(entryOf(key))
    },
  })
  drag({
    element: box,
    gap: gaps({ axis: 'y', itemOf: all.itemOf }),
    itemOf: all.itemOf,
    reorder,
    showing: dragging.set,
  })
  edgeScroll({
    active: {
      get: () => dragging.get() !== undefined,
      watch: (listener) =>
        dragging.watch(() => {
          listener()
        }),
    },
    element: scroller,
    scrollBy: shown.scrollBy,
  })
  const moves = move({ from: active.get, step, to: active.set })
  keybinds(
    [
      later('next', 'ArrowDown', async () => moves.by(1)),
      later('previous', 'ArrowUp', async () => moves.by(-1)),
      later('first', 'Home', async () => moves.edge(1)),
      later('last', 'End', async () => moves.edge(-1)),
      {
        execute: () => {
          const key = active.get()
          selectedEntry.set(key === undefined ? undefined : entryOf(key))
        },
        id: 'choose',
        keys: ['Space'],
        label: 'Choose',
      },
    ],
    () => ({}),
    { inputs: [keys()], target: box },
  )
}

/**
 * What the overview shows now
 * @returns {OverviewSeen} What a screen reader is told, and what is drawn
 */
function seenOverview() {
  const named = tree?.getAttribute('aria-activedescendant')
  const active = named === null || named === undefined ? undefined : document.querySelector(`#${CSS.escape(named)}`)
  let depth = 0
  for (
    let node = active?.parentElement;
    node !== null && node !== undefined && node !== tree;
    node = node.parentElement
  ) {
    depth += node.getAttribute('role') === 'group' ? 1 : 0
  }
  const card = active?.firstElementChild?.getBoundingClientRect()
  const view = tree?.parentElement?.getBoundingClientRect()
  let top = active
  while (top?.parentElement !== null && top?.parentElement !== undefined && top.parentElement !== tree) {
    top = top.parentElement
  }
  return {
    active: active?.firstElementChild?.textContent ?? undefined,
    depth,
    drawn: tree?.querySelectorAll('[role=treeitem]').length ?? 0,
    drawnTop: tree?.querySelectorAll(':scope > [role=treeitem]').length ?? 0,
    focused: document.activeElement === tree,
    inView: card !== undefined && view !== undefined && card.top >= view.top - 1 && card.bottom <= view.bottom + 1,
    position: top?.getAttribute('aria-posinset') ?? undefined,
    selected: tree?.querySelectorAll('[aria-selected=true]').length ?? 0,
  }
}

/**
 * A region's members now
 * @param {string} region - The region's entry
 * @returns {readonly string[]} Its members
 */
function membersNow(region) {
  return membersOf(region)
}

export { idOf, membersNow, putOverview, seenOverview }
