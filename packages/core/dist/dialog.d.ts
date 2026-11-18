/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
 * shown over everything else in an overlay. `open` is always the app's, by the contract's rule: Escape (one the content
 * didn't take, heard as it bubbles from the content), the close button, and a press outside the dialog (on the overlay,
 * unless `ignoreOutside`) close it at once, pending, and emit `change` with `false`; the props confirm it, or
 * `refused` opens it again. A press outside closes it once it is released there, so what is under the overlay never
 * takes the click. Opening focuses the part the app names. Keeping focus inside while open, and giving it back on
 * close, is what `aria-modal` asks of the host.
 */
import type { Change, Click, Focus, KeyDown, MouseDown, PreventDefault, PropsInput, Ref, Refused, View } from './contract.js';
import type { AnyWidget, PropsOf } from './compose.js';
import type { Pending } from './pending.js';
export type DialogProps<CP> = Readonly<{
    title: string;
    closeLabel: string;
    open: boolean;
    ignoreOutside: boolean;
    content: CP;
}>;
export type DialogOwn<CP> = Readonly<{
    title: string;
    closeLabel: string;
    open: Pending<boolean>;
    ignoreOutside: boolean;
    outside: boolean;
    content: CP;
}>;
export type DialogInput<CP> = KeyDown | Click | MouseDown | Refused | PropsInput<DialogProps<CP>>;
export type DialogEffect = Change<boolean> | Focus | PreventDefault;
/**
 * The dialog's parts
 * @param {DialogOwn<unknown>} own - The dialog
 * @returns {View} Its parts
 */
declare function view(own: DialogOwn<unknown>): View;
/**
 * A modal dialog around a widget
 * @template {AnyWidget} W
 * @param {W} content - The widget inside
 * @param {Ref['part']} initialFocus - The part focused when it opens, from the dialog (`['content', ...]` is inside
 *   the content)
 * @returns {import('./compose.js').Composite<DialogProps<PropsOf<W>>, DialogOwn<PropsOf<W>>, DialogInput<PropsOf<W>>, DialogEffect, Readonly<{ content: W }>>}
 *   The dialog
 */
declare function dialog<W extends AnyWidget>(content: W, initialFocus: Ref['part']): import('./compose.js').Composite<DialogProps<PropsOf<W>>, DialogOwn<PropsOf<W>>, DialogInput<PropsOf<W>>, DialogEffect, Readonly<{
    content: W;
}>>;
export { dialog, view as dialogView };
