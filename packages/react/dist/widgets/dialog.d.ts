import type { AnyComponent, Component, Own, OwnOf, PartsInside } from '../interact.js';
import type { PropsOf } from '@pterror/interact-core';
import type { dialog as source } from '@pterror/interact-core/dialog';
export type Widget = ReturnType<typeof source>;
export type WidgetProps = PropsOf<Widget>;
/** @import { AnyComponent, Component, Own, OwnOf, PartsInside } from '../interact.js' */
/** @import { PropsOf } from '@pterror/interact-core' */
/** @import { dialog as source } from '@pterror/interact-core/dialog' */
/** @typedef {ReturnType<typeof source>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog
 * (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). `open` is always the app's, by the contract's rule:
 * Escape (one the content didn't take, heard as it bubbles from the content) and the close button close it at
 * once, pending, and emit `change` with `false`; the props confirm it, or `refused` opens it again. Opening
 * focuses the part the app names. Keeping focus inside while open, and giving it back on close, is what
 * `aria-modal` asks of the host.
 * @template {AnyComponent} Content
 * @param {Content} content - The widget inside
 * @param {Parameters<typeof source>[1]} initialFocus - The part focused when it opens, from the dialog (`['content', ...]` is inside the content)
 * @returns {Component<Own<WidgetProps, 'open', WidgetProps['open'], never, Readonly<{ content: OwnOf<Content> }>>, 'close' | 'root' | 'title' | PartsInside<Content, 'content'>>}
 *   The component
 */
declare function dialog<Content extends AnyComponent>(content: Content, initialFocus: Parameters<typeof source>[1]): Component<Own<WidgetProps, 'open', WidgetProps['open'], never, Readonly<{
    content: OwnOf<Content>;
}>>, 'close' | 'root' | 'title' | PartsInside<Content, 'content'>>;
export { dialog };
