import type { AnyComponent, Component, Make, Own, OwnOf, PartsInside } from '../component.js';
import type { PropsOf } from '@pterror/interact-core';
import type { dialog as source } from '@pterror/interact-core/dialog';
export type Widget = ReturnType<typeof source>;
export type WidgetProps = PropsOf<Widget>;
/** @import { AnyComponent, Component, Make, Own, OwnOf, PartsInside } from '../component.js' */
/** @import { PropsOf } from '@pterror/interact-core' */
/** @import { dialog as source } from '@pterror/interact-core/dialog' */
/** @typedef {ReturnType<typeof source>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */
/**
 * Makes `dialog` with an entry's `component`
 * @param {Make} component - The entry's `component`
 * @returns The factory of components
 */
declare function dialogWith(component: Make): <Content extends AnyComponent>(content: Content, initialFocus: Parameters<typeof source>[1]) => Component<Own<WidgetProps, 'open', WidgetProps['open'], never, Readonly<{
    content: OwnOf<Content>;
}>, never>, 'close' | 'dialog' | 'root' | 'title' | PartsInside<Content, 'content'>>;
export { dialogWith };
