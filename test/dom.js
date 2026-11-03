import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow()

/*
 * Everything the DOM touches has to come from the same window: happy-dom's elements reject events made by Bun's own
 * Event classes, and newer happy-dom versions check this strictly. So these always replace what the runtime
 * provides, rather than only filling gaps. In a browser globalThis is the window, so its events are the window's here
 * too.
 */
Object.assign(globalThis, {
  CSSStyleSheet: window.CSSStyleSheet,
  Comment: window.Comment,
  CustomEvent: window.CustomEvent,
  Document: window.Document,
  DocumentFragment: window.DocumentFragment,
  Element: window.Element,
  ErrorEvent: window.ErrorEvent,
  Event: window.Event,
  EventTarget: window.EventTarget,
  FocusEvent: window.FocusEvent,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLLIElement: window.HTMLLIElement,
  HTMLTemplateElement: window.HTMLTemplateElement,
  KeyboardEvent: window.KeyboardEvent,
  MouseEvent: window.MouseEvent,
  MutationObserver: window.MutationObserver,
  Node: window.Node,
  PointerEvent: window.PointerEvent,
  ShadowRoot: window.ShadowRoot,
  Text: window.Text,
  WheelEvent: window.WheelEvent,
  addEventListener: window.addEventListener.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  customElements: window.customElements,
  dispatchEvent: window.dispatchEvent.bind(window),
  document: window.document,
  getComputedStyle: window.getComputedStyle.bind(window),
  localStorage: window.localStorage,
  navigator: window.navigator,
  removeEventListener: window.removeEventListener.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  window,
})
