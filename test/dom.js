import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow()

/*
 * Everything the DOM touches has to come from the same window: happy-dom's elements reject events made by Bun's own
 * Event classes, and newer happy-dom versions check this strictly. So these always replace what the runtime
 * provides, rather than only filling gaps.
 */
Object.assign(globalThis, {
  CustomEvent: window.CustomEvent,
  Element: window.Element,
  Event: window.Event,
  EventTarget: window.EventTarget,
  FocusEvent: window.FocusEvent,
  HTMLElement: window.HTMLElement,
  KeyboardEvent: window.KeyboardEvent,
  MouseEvent: window.MouseEvent,
  Node: window.Node,
  PointerEvent: window.PointerEvent,
  WheelEvent: window.WheelEvent,
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  customElements: window.customElements,
  document: window.document,
  localStorage: window.localStorage,
  navigator: window.navigator,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  window,
})
