/**
 * The worldbuilding overview: a hundred thousand top-level entries, every third a region, each region's members cut
 * at three, nested three levels deep, with "+N more" tiles, a region that contains itself (cut where it recurs) and an
 * entry in two regions. Answered by an in-memory stand-in for the server that works members out from ids rather than
 * storing them, drawn only near what is in view, wired by hand from `@pterror/interact-list`, for the browser test.
 */

import { keybinds } from '@pterror/interact-keybinds'
import {
  activeDescendant,
  byEntry,
  cell,
  collapse,
  content,
  drag,
  edgeScroll,
  flowMount,
  gaps,
  ids,
  items,
  keySet,
  keepInPlace,
  mark,
  measure,
  measuredRows,
  move,
  nest,
  pick,
  relationStep,
  place,
  posInSet,
  render,
  reveal,
  sizer,
  treeCache,
  viewport,
  visibleRanks,
  windowing,
} from '@pterror/interact-list'

const TOPS = 100_000
const FEW = 3
const SHARED = 'Shared'
const MORE = '+'

/**
 * An occurrence in the overview as the server answers it
 * @typedef {Readonly<{ key: string, entry: string | undefined, kind: 'entry' | 'region' | 'repeat' | 'more',
 *   label: string, closed?: boolean, count?: number, children?: readonly Occurrence[] }>} Occurrence
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
/** The regions closed in the view: kept in memory here, as a test has nowhere else to keep them */
/** @type {ReturnType<typeof keySet<string>>} */
const closed = keySet()
closed.watch(() => {
  for (const listener of changed) {
    listener()
  }
})

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
  if (closed.has(key)) {
    return { children: [], closed: true, count: all.length, entry: id, key, kind: 'region', label: labelOf(id) }
  }
  const children = all.slice(0, FEW).map((member) => occurrence(`${key}/${member}`, member, inside))
  const more = all.length - FEW
  /** @type {readonly Occurrence[]} */
  const tile =
    more > 0 ? [{ entry: undefined, key: `${key}/${MORE}`, kind: 'more', label: `+${String(more)} more` }] : []
  return {
    children: [...children, ...tile],
    closed: false,
    count: all.length,
    entry: id,
    key,
    kind: 'region',
    label: labelOf(id),
  }
}

/** Entries added at the top level, before the base entry of each rank, in order */
/** @type {Map<number, string[]>} */
const inserted = new Map()
/** Base entries taken out of the top level, by their rank among the base entries */
/** @type {Set<number>} */
const removed = new Set()
let added = 0

/** @returns {number} How many top-level entries there are */
function topCount() {
  let count = TOPS - removed.size
  for (const entries of inserted.values()) {
    count += entries.length
  }
  return count
}

/** @returns {number[]} The base ranks where the top level was edited, in order */
function edits() {
  return [...new Set([...inserted.keys(), ...removed])].toSorted((one, other) => one - other)
}

/**
 * The top-level entry at a rank, through the edits
 * @param {number} rank - The rank
 * @returns {string | undefined} The entry
 */
function idAt(rank) {
  let left = rank
  let base = 0
  for (const edit of edits()) {
    if (left < edit - base) {
      return `E${String(base + left)}`
    }
    left -= edit - base
    const before = inserted.get(edit) ?? []
    if (left < before.length) {
      return before[left]
    }
    left -= before.length
    if (!removed.has(edit)) {
      if (left === 0) {
        return `E${String(edit)}`
      }
      left -= 1
    }
    base = edit + 1
  }
  return base + left < TOPS && left >= 0 ? `E${String(base + left)}` : undefined
}

/**
 * The rank at which a base entry's slot starts: the first entry added before it, or it
 * @param {number} edit - The base rank
 * @returns {number} The rank
 */
function slotOf(edit) {
  let rank = edit
  for (const [at, entries] of inserted) {
    rank += at < edit ? entries.length : 0
  }
  for (const at of removed) {
    rank -= at < edit ? 1 : 0
  }
  return rank
}

/**
 * A top-level entry's rank, through the edits
 * @param {string} id - The entry
 * @returns {number | undefined} Its rank, if it is at the top level
 */
function rankOfTop(id) {
  const base = topNumber(id)
  if (base !== undefined) {
    return base < TOPS && !removed.has(base) ? slotOf(base) + (inserted.get(base)?.length ?? 0) : undefined
  }
  for (const [edit, entries] of inserted) {
    const index = entries.indexOf(id)
    if (index !== -1) {
      return slotOf(edit) + index
    }
  }
  return undefined
}

/**
 * Tells everyone the overview changed
 * @returns {void}
 */
function tell() {
  for (const listener of changed) {
    listener()
  }
}

/**
 * Adds entries at the top level
 * @param {number} rank - Where: before the entry now at this rank
 * @param {number} count - How many
 * @returns {void}
 */
function insertTop(rank, count) {
  const at = idAt(rank)
  const fresh = Array.from({ length: count }, () => {
    added += 1
    return `N${String(added)}`
  })
  const base = at === undefined ? undefined : topNumber(at)
  if (base !== undefined) {
    inserted.set(base, [...(inserted.get(base) ?? []), ...fresh])
  } else {
    for (const [edit, entries] of inserted) {
      const index = at === undefined ? -1 : entries.indexOf(at)
      if (index !== -1) {
        inserted.set(edit, [...entries.slice(0, index), ...fresh, ...entries.slice(index)])
      }
    }
  }
  tell()
}

/**
 * Takes entries out of the top level
 * @param {number} rank - Where: from the entry now at this rank
 * @param {number} count - How many
 * @returns {void}
 */
function removeTop(rank, count) {
  for (let left = count; left > 0; left -= 1) {
    const at = idAt(rank)
    const base = at === undefined ? undefined : topNumber(at)
    if (base !== undefined) {
      removed.add(base)
    } else {
      for (const [edit, entries] of inserted) {
        inserted.set(
          edit,
          entries.filter((each) => each !== at),
        )
      }
    }
  }
  tell()
}

/**
 * A top-level entry's occurrence
 * @param {number} rank - Its rank
 * @returns {Occurrence | undefined} It, cut short
 */
function topAt(rank) {
  const id = idAt(rank)
  return id === undefined ? undefined : occurrence(id, id, new Set())
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
  return rankOfTop(key.split('/')[0] ?? '')
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
  /** @type {Occurrence[]} */
  const found = []
  for (let rank = Math.max(from, 0); rank < Math.min(to, topCount()); rank += 1) {
    const top = topAt(rank)
    if (top !== undefined) {
      found.push(top)
    }
  }
  return Promise.resolve(found)
}

/**
 * Every occurrence under a top-level entry, in reading order
 * @param {number} rank - The entry's rank
 * @returns {string[]} Their keys; none past the end
 */
function orderAt(rank) {
  const top = topAt(rank)
  return top === undefined ? [] : readingOrder(top)
}

/**
 * The server's answer: the occurrence `by` places on in reading order, across regions and top-level entries
 * @param {string | undefined} from - Where to start; none for an end
 * @param {number} by - How far
 * @returns {Promise<string | undefined>} The occurrence
 */
function step(from, by) {
  if (from === undefined) {
    return Promise.resolve(by < 0 ? orderAt(topCount() - 1).at(-1) : orderAt(0)[0])
  }
  let key = from
  for (let left = Math.abs(by); left > 0; left -= 1) {
    const rank = rankOf(key) ?? 0
    const order = orderAt(rank)
    const index = order.indexOf(key) + Math.sign(by)
    if (index >= 0 && index < order.length) {
      key = order[index] ?? key
    } else if (by > 0 && rank + 1 < topCount()) {
      key = orderAt(rank + 1)[0] ?? key
    } else if (by < 0 && rank > 0) {
      key = orderAt(rank - 1).at(-1) ?? key
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
  tell()
}

/**
 * The server's answer: the region an occurrence is shown in, as an occurrence
 * @param {string} key - The occurrence
 * @returns {Promise<string | undefined>} The region's occurrence; none at the top level
 */
function parentKey(key) {
  const cut = key.lastIndexOf('/')
  return Promise.resolve(cut === -1 ? undefined : key.slice(0, cut))
}

/**
 * The server's answer: a region's first member, as an occurrence
 * @param {string} key - The occurrence
 * @returns {Promise<string | undefined>} Its first member; none for anything but a region
 */
function firstChildKey(key) {
  const rank = rankOf(key)
  const order = rank === undefined ? [] : orderAt(rank)
  const next = order[order.indexOf(key) + 1]
  return Promise.resolve(next?.startsWith(`${key}/`) === true ? next : undefined)
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
 * A binding that starts something that finishes later
 * @param {string} key - Its key
 * @param {() => Promise<void>} start - What it does
 * @returns {Readonly<{ keys: readonly string[], run: () => void }>} The binding
 */
function later(key, start) {
  return {
    keys: [key],
    run: () => {
      void start()
    },
  }
}

/** @type {HTMLElement | undefined} */
let tree = undefined
/** @type {ReturnType<typeof collapse<string>> | undefined} */
let regions = undefined

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
  const count = {
    get: topCount,
    /**
     * @param {() => void} listener - Hears the count change
     * @returns {() => void} Stops
     */
    watch(listener) {
      changed.add(listener)
      return () => {
        changed.delete(listener)
      }
    },
  }
  const shown = viewport(scroller)
  const held = keyCell(undefined)
  const activeTop = () => active.get()?.split('/')[0]
  const drawn = windowing({
    keep: {
      get: () => [...new Set([activeTop(), held.get()])].filter((key) => key !== undefined),
      watch(listener) {
        const stops = [active.watch(listener), held.watch(listener)]
        return () => {
          for (const stop of stops) {
            stop()
          }
        }
      },
    },
    keysAt: cache,
    locate: cache.locate,
    ranks: visibleRanks({ count, layout, visible: shown }),
  })
  sizer({ count, element: box, layout })
  keepInPlace({ drawn, hold: held.set, layout, prefer: activeTop, scrollBy: shown.scrollBy, visible: shown })

  /**
   * An occurrence's element: a treeitem, holding its region's members in a group
   * @param {string} key - The occurrence
   * @returns {Element} The element
   */
  const create = (key) => {
    const node = cache.node(key)
    const item = document.createElement('div')
    item.setAttribute('role', 'treeitem')
    item.dataset['key'] = key
    item.style.cssText = 'user-select: none; padding: 2px 0'
    const head = document.createElement('div')
    head.id = `${idOf(key)}-head`
    head.style.cssText = node?.kind === 'more' ? 'font-style: italic' : 'border: 1px solid; padding: 4px'
    item.append(head)
    if (node?.kind === 'region') {
      const group = document.createElement('div')
      group.setAttribute('role', 'group')
      group.style.paddingLeft = '20px'
      item.append(group)
    }
    return item
  }

  /** @type {ReturnType<typeof items<string>>} */
  const all = items()
  /** @type {import('@pterror/interact-list/render').Facet<string>[]} */
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
        const node = cache.node(key)
        const head = element.firstElementChild
        if (head !== null) {
          head.textContent =
            node?.closed === true ? `${node.label} (${String(node.count ?? 0)} members)` : (node?.label ?? '')
        }
        if (node?.kind === 'region') {
          element.setAttribute('aria-expanded', String(node.closed !== true))
          const group = element.querySelector(':scope > [role=group]')
          if (group instanceof HTMLElement) {
            group.hidden = node.closed === true
          }
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
  const out = move({ from: active.get, step: relationStep(parentKey), to: active.set })
  const into = move({ from: active.get, step: relationStep(firstChildKey), to: active.set })
  regions = collapse({ active, closed, inside: (key, region) => Promise.resolve(key.startsWith(`${region}/`)) })
  const opening = regions
  /**
   * Whether the active key is the head of a region, and whether that region is closed
   * @returns {Readonly<{ key: string, closed: boolean }> | undefined} The region, if the active key heads one
   */
  const activeRegion = () => {
    const key = active.get()
    return key === undefined || cache.node(key)?.kind !== 'region' ? undefined : { closed: closed.has(key), key }
  }
  keybinds(
    [
      later('ArrowDown', async () => moves.by(1)),
      later('ArrowUp', async () => moves.by(-1)),
      later('Home', async () => moves.edge(1)),
      later('End', async () => moves.edge(-1)),
      later('ArrowLeft', async () => {
        const region = activeRegion()
        return region === undefined || region.closed ? out.by(1) : opening.close(region.key)
      }),
      later('ArrowRight', async () => {
        const region = activeRegion()
        if (region?.closed === true) {
          opening.open(region.key)
          return undefined
        }
        return into.by(1)
      }),
      {
        keys: ['Space'],
        run: () => {
          const key = active.get()
          selectedEntry.set(key === undefined ? undefined : entryOf(key))
        },
      },
    ],
    { target: box },
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

/**
 * The top-level entries in view, and where each starts on screen
 * @returns {readonly Readonly<{ text: string, top: number, position: string | undefined }>[]} Each, from the top
 */
function topsInView() {
  const view = tree?.parentElement?.getBoundingClientRect()
  /** @type {Readonly<{ text: string, top: number, position: string | undefined }>[]} */
  const found = []
  for (const item of tree?.querySelectorAll(':scope > [role=treeitem]') ?? []) {
    const top = Math.round(item.getBoundingClientRect().top)
    if (view !== undefined && top >= view.top && top < view.bottom) {
      found.push({
        position: item.getAttribute('aria-posinset') ?? undefined,
        text: item.firstElementChild?.textContent ?? '',
        top,
      })
    }
  }
  return found.toSorted((one, other) => one.top - other.top)
}

/**
 * The rank of the first top-level entry in view
 * @returns {number} Its rank
 */
function firstInView() {
  const view = tree?.parentElement?.getBoundingClientRect()
  /** @type {{ key: string, top: number } | undefined} */
  let first = undefined
  for (const item of tree?.querySelectorAll(':scope > [role=treeitem]') ?? []) {
    const { top } = item.getBoundingClientRect()
    if (
      view !== undefined &&
      top >= view.top &&
      (first === undefined || top < first.top) &&
      item instanceof HTMLElement
    ) {
      first = { key: item.dataset['key'] ?? '', top }
    }
  }
  return (first === undefined ? undefined : rankOfTop(first.key)) ?? 0
}

/**
 * Scrolls to a part of the way down
 * @param {number} fraction - How far, from 0 to 1
 * @returns {void}
 */
function scrollToFraction(fraction) {
  const scroller = tree?.parentElement
  if (scroller) {
    scroller.scrollTop = fraction * (scroller.scrollHeight - scroller.clientHeight)
  }
}

/**
 * Closes a region, as the overview does
 * @param {string} key - The region's occurrence
 * @returns {Promise<void>} When closed
 */
async function closeRegion(key) {
  await regions?.close(key)
}

/**
 * Opens a region
 * @param {string} key - The region's occurrence
 * @returns {void}
 */
function openRegion(key) {
  regions?.open(key)
}

/**
 * An open top-level region drawn above the view
 * @returns {string | undefined} Its key
 */
function regionAboveView() {
  const view = tree?.parentElement?.getBoundingClientRect()
  /** @type {{ key: string, top: number } | undefined} */
  let found = undefined
  for (const item of tree?.querySelectorAll(':scope > [aria-expanded=true]') ?? []) {
    const { bottom, top } = item.getBoundingClientRect()
    if (
      view !== undefined &&
      bottom < view.top &&
      item instanceof HTMLElement &&
      (found === undefined || top > found.top)
    ) {
      found = { key: item.dataset['key'] ?? '', top }
    }
  }
  return found?.key
}

export {
  closeRegion,
  openRegion,
  regionAboveView,
  firstInView,
  idOf,
  insertTop,
  membersNow,
  putOverview,
  removeTop,
  scrollToFraction,
  seenOverview,
  topsInView,
}
