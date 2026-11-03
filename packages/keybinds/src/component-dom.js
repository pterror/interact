/**
 * Building a component's shadow DOM: elements made with their class, part and text, so each is held as the element it
 * is rather than looked up again, and the styles every overlay shares.
 */

/**
 * What an element is made with
 * @typedef {Readonly<{ className: string, part?: string, text?: string }>} Made
 */

/**
 * How every overlay shows: hidden until it's open
 */
const OVERLAY_STYLE = `@layer keybinds.structure {
  :host { display: none; }
  :host(:where([open])) { display: block; }
  :where(*) { box-sizing: border-box; }
}`

/**
 * An HTML element with its class, and its part name and text if given
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag - Which element
 * @param {Made} made - Its class, part name (for ::part()) and text
 * @returns {HTMLElementTagNameMap[K]} The element
 */
function make(tag, { className, part, text }) {
  const element = document.createElement(tag)
  element.className = className
  if (part !== undefined) {
    element.setAttribute('part', part)
  }
  if (text !== undefined) {
    element.textContent = text
  }
  return element
}

/**
 * A `<style>` element holding a stylesheet
 * @param {string} css - The stylesheet
 * @returns {HTMLStyleElement} The element
 */
function styleOf(css) {
  const style = document.createElement('style')
  style.textContent = css
  return style
}

/**
 * A space-separated list of names, those whose condition holds
 * @param {Readonly<Record<string, boolean>>} names - Each name, and whether it's in the list
 * @returns {string} The names that are
 */
function namesOf(names) {
  /** @type {string[]} */
  const on = []
  for (const [name, wanted] of Object.entries(names)) {
    if (wanted) {
      on.push(name)
    }
  }
  return on.join(' ')
}

export { OVERLAY_STYLE, make, namesOf, styleOf }
