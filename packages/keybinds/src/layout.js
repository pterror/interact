/**
 * The person's keyboard layout: what each physical key types, by `event.code`, from the browser where it can tell
 * (navigator.keyboard.getLayoutMap(), in Chromium); unknown elsewhere. Browsers say nothing when someone switches
 * layouts, so while watched it looks again when the window gets focus back, and when a key types something other than
 * the layout says.
 */

/**
 * @typedef {ReadonlyMap<string, string> | undefined} Layout
 */

/**
 * The layout as the browser says now
 * @returns {Promise<Layout>} What each physical key types, or nothing where the browser can't tell or won't
 */
async function load() {
  try {
    return await (typeof navigator === 'undefined' ? undefined : navigator.keyboard?.getLayoutMap())
  } catch {
    return undefined
  }
}

/**
 * Whether two layouts type the same
 * @param {Layout} first - One
 * @param {Layout} second - The other
 * @returns {boolean} Whether they do
 */
function same(first, second) {
  if (first === undefined || second === undefined || first.size !== second.size) {
    return first === second
  }
  for (const [code, typed] of first) {
    if (second.get(code) !== typed) {
      return false
    }
  }
  return true
}

/**
 * The layout, followed
 * @param {EventTarget} [view] - The window to follow (default the global one)
 * @returns {Readonly<{ get: () => Layout, watch: (listener: () => void) => () => void }>} The layout as last loaded,
 *   and hearing it change
 */
function layout(view = globalThis) {
  /** @type {Layout} */
  let current = undefined
  let asked = 0
  /** @type {Set<() => void>} */
  const listeners = new Set()

  const loaded = async () => {
    asked += 1
    const mine = asked
    const next = await load()
    if (mine === asked && !same(next, current)) {
      current = next
      for (const listener of listeners) {
        listener()
      }
    }
  }

  const reload = () => {
    void loaded()
  }

  /**
   * @param {Event} event - A keydown
   * @returns {void}
   */
  const onKey = (event) => {
    if (!(event instanceof KeyboardEvent) || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      return
    }
    const said = current?.get(event.code)
    if (said !== undefined && /^.$/su.test(event.key) && said !== event.key.toLowerCase()) {
      reload()
    }
  }

  reload()
  return {
    get: () => current,
    watch(listener) {
      if (listeners.size === 0) {
        view.addEventListener('focus', reload)
        view.addEventListener('keydown', onKey, { capture: true, passive: true })
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          view.removeEventListener('focus', reload)
          view.removeEventListener('keydown', onKey, { capture: true })
        }
      }
    },
  }
}

export { layout }
