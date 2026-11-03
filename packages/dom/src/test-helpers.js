/**
 * @import { ComponentClass } from './component.js'
 * @import { Range } from './collect.js'
 * @import { Part } from './instance.js'
 * @import { TemplateResult } from './template.js'
 */

import { ChildPart } from './child-part.js'
import { component } from './component.js'
import { css } from './css.js'
import { CLOSE, OPEN, isMarker } from './markers.js'
import { renderToString } from './render-string.js'
import { html } from './template.js'

const STEP = 1

/**
 * A behavior to test components with: a count, and a way to add one.
 */
class Counter {
  #count = STEP - STEP
  /**
   * @readonly
   * @type {Set<() => void>}
   */
  #listeners = new Set()

  /**
   * How many times it was added to.
   * @returns {number} The count
   */
  get count() {
    return this.#count
  }

  /**
   * Adds one.
   * @returns {void}
   */
  increment() {
    this.#count += STEP
    for (const listener of this.#listeners) {
      listener()
    }
  }

  /**
   * Calls `listener` whenever the count changes.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
}

/** A counter's view: its host red, its count blue, and a click adds one. */
const counterView = {
  kind: 'counter',
  /**
   * The button showing the count.
   * @param {Counter} counter - The counter
   * @returns {TemplateResult} The view
   */
  render: (counter) =>
    html`<button
      part="count"
      @click=${() => {
        counter.increment()
      }}
      >${counter.count}</button
    >`,
  styles: css`
    @layer test {
      :where(:scope) {
        display: block;
        color: rgb(255, 0, 0);
      }
      :where([part~='count']) {
        color: rgb(0, 0, 255);
      }
    }
  `,
}

/** A badge's view: a count part of its own, which the counter's styles must not reach. */
const badgeView = {
  kind: 'badge',
  /**
   * The badge.
   * @returns {TemplateResult} The view
   */
  render: () => html`<span part="count">badge</span>`,
  styles: css`
    @layer test {
      :where(:scope) {
        display: inline;
      }
    }
  `,
}

/**
 * A view that notes what its root shows each time it has rendered.
 * @returns {Readonly<{ view: import('./component.js').View<Counter>, log: string[] }>} The view, and what it noted
 */
function renderingView() {
  /** @type {string[]} */
  const log = []
  return {
    log,
    view: {
      kind: 'rendering',
      render: (counter) => html`<span>${counter.count}</span>`,
      rendered: (_counter, root) => {
        log.push(`rendered ${root.textContent}`)
      },
      styles: css`
        @layer test {
          :where(:scope) {
            display: block;
          }
        }
      `,
    },
  }
}

/**
 * The counter and badge element classes, made when asked for, since they need `HTMLElement`.
 * @returns {Readonly<{ CounterElement: ComponentClass<Counter>, BadgeElement: ComponentClass<Counter> }>} The classes
 */
function testElements() {
  return {
    BadgeElement: component(badgeView, () => new Counter()),
    CounterElement: component(counterView, () => new Counter()),
  }
}

/**
 * A container holding a template's server markup.
 * @param {TemplateResult} result - The template
 * @returns {HTMLDivElement} The container
 */
function serverMarkup(result) {
  const container = document.createElement('div')
  container.innerHTML = renderToString(result)
  return container
}

/**
 * The markers around a container's content, which must start and end with them.
 * @param {Element} container - The container
 * @returns {Range} Its first and last nodes
 */
function outerRange(container) {
  const { firstChild: open, lastChild: close } = container
  if (!isMarker(open, OPEN) || !isMarker(close, CLOSE)) {
    throw new Error('The container does not start and end with markers')
  }
  return { close, open }
}

/**
 * An empty child hole at the end of a new container.
 * @returns {Readonly<{ container: HTMLDivElement, range: Range }>} The container and the hole's markers
 */
function emptyHole() {
  const container = document.createElement('div')
  const range = { close: document.createComment(CLOSE), open: document.createComment(OPEN) }
  container.append(range.open, range.close)
  return { container, range }
}

/**
 * Makes real child parts, as rendering does.
 * @param {Range} range - The hole's markers
 * @param {boolean} adopting - Whether to adopt server markup
 * @returns {Part} The part
 */
function childParts(range, adopting) {
  return new ChildPart(range, adopting)
}

/**
 * Makes child parts that ignore their values, to test something without them.
 * @returns {Part} A part that does nothing
 */
function noChildren() {
  return { set: () => undefined }
}

/**
 * An element found by a selector, which must be there.
 * @param {Element | DocumentFragment} root - Where to look
 * @param {string} selector - What to look for
 * @returns {HTMLElement} The element
 */
function find(root, selector) {
  const found = root.querySelector(selector)
  if (!(found instanceof HTMLElement)) {
    throw new TypeError(`Nothing matches ${selector}`)
  }
  return found
}

/**
 * A container's first node, which must be an `OPEN` marker.
 * @param {Element} container - The container
 * @returns {Comment} The marker
 */
function firstOpen(container) {
  const { firstChild } = container
  if (!isMarker(firstChild, OPEN)) {
    throw new Error('The container does not start with an open marker')
  }
  return firstChild
}

/**
 * A container's last node, which must be there.
 * @param {Element} container - The container
 * @returns {ChildNode} The node
 */
function lastNode(container) {
  const { lastChild } = container
  if (!lastChild) {
    throw new Error('The container is empty')
  }
  return lastChild
}

/**
 * Starts noting every node added to or removed from a container's children.
 * @param {Element} container - The container
 * @returns {() => Node[]} Stops, and gives the nodes noted
 */
function watchChildren(container) {
  const observer = new MutationObserver(() => undefined)
  observer.observe(container, { childList: true })
  return () => {
    const records = observer.takeRecords()
    observer.disconnect()
    /** @type {Node[]} */
    const nodes = []
    for (const record of records) {
      nodes.push(...record.addedNodes, ...record.removedNodes)
    }
    return nodes
  }
}

export {
  Counter,
  renderingView,
  badgeView,
  counterView,
  testElements,
  watchChildren,
  childParts,
  emptyHole,
  find,
  firstOpen,
  lastNode,
  noChildren,
  outerRange,
  serverMarkup,
}
