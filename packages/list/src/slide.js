/**
 * An element slid by its `translate` from where it was drawn to where it rests, by a Web Animation, with the same
 * easing whichever module slides it (`follow`, `makeRoom`, `slideMoved`). An element has one slide at a time: starting
 * one, or stopping, ends the one under way, whoever started it.
 */

import { translated } from './translated.js'

/** Below this, in CSS pixels, a slide wouldn't show */
const UNSEEN = 0.5
const EASING = 'ease-out'

/** @type {WeakMap<Element, Animation>} */
const slides = new WeakMap()

/**
 * Where an element is drawn now, part-way through any slide
 * @param {Element} element - The element
 * @returns {Readonly<{ x: number, y: number }>} Its box's left and top in the viewport, in CSS pixels
 */
function drawnAt(element) {
  const box = element.getBoundingClientRect()
  return { x: box.left, y: box.top }
}

/**
 * Ends the slide of an element under way, leaving it where it rests
 * @param {Element} element - The element
 * @returns {void}
 */
function stopSlide(element) {
  slides.get(element)?.cancel()
  slides.delete(element)
}

/**
 * Slides an element from where it was drawn to where it rests: where its layout and its own `translate` put it
 * @param {Element} element - The element
 * @param {Readonly<{ x: number, y: number }>} from - Where it was drawn (`drawnAt`)
 * @param {number} duration - How long, in ms, the slide takes (0: it jumps)
 * @returns {Animation | undefined} The slide; none when it jumps or wouldn't show
 */
function slide(element, from, duration) {
  stopSlide(element)
  const rest = drawnAt(element)
  const x = from.x - rest.x
  const y = from.y - rest.y
  if (duration <= 0 || Math.hypot(x, y) < UNSEEN) {
    return undefined
  }
  const own = translated(element)
  const animation = element.animate(
    [
      { translate: `${String(own.x + x)}px ${String(own.y + y)}px` },
      { translate: `${String(own.x)}px ${String(own.y)}px` },
    ],
    { duration, easing: EASING },
  )
  slides.set(element, animation)
  animation.addEventListener('finish', () => {
    if (slides.get(element) === animation) {
      slides.delete(element)
    }
  })
  return animation
}

/**
 * Whether a slide is under way
 * @param {Readonly<Animation> | undefined} animation - The slide
 * @returns {boolean} Whether it is
 */
function sliding(animation) {
  return animation?.playState === 'running'
}

export { drawnAt, slide, sliding, stopSlide }
