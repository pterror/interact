import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow()

/*
 * Everything the DOM touches has to come from the same window: happy-dom's elements reject events made by Bun's own
 * Event classes, and newer happy-dom versions check this strictly. So these always replace what the runtime
 * provides, rather than only filling gaps.
 */
Object.assign(globalThis, {
  CSSStyleSheet: window.CSSStyleSheet,
  Comment: window.Comment,
  CustomEvent: window.CustomEvent,
  DocumentFragment: window.DocumentFragment,
  Element: window.Element,
  Event: window.Event,
  EventTarget: window.EventTarget,
  FocusEvent: window.FocusEvent,
  HTMLElement: window.HTMLElement,
  HTMLTemplateElement: window.HTMLTemplateElement,
  KeyboardEvent: window.KeyboardEvent,
  MouseEvent: window.MouseEvent,
  MutationObserver: window.MutationObserver,
  Node: window.Node,
  PointerEvent: window.PointerEvent,
  ShadowRoot: window.ShadowRoot,
  Text: window.Text,
  WheelEvent: window.WheelEvent,
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  customElements: window.customElements,
  document: window.document,
  localStorage: window.localStorage,
  navigator: window.navigator,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  window,
})
