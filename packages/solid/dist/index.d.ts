/**
 * Solid and interact's abstractions, both ways: signals and memos as Values, Watched, Drawn and Sets; Watched
 * and Tests as accessors; a component as what render draws; `Interact`, any interact core widget drawn by Solid;
 * and a component for each of the core's widgets, generated from it. For Solid 1.8+ (`solid-js` and
 * `solid-js/web`).
 */
export { componentItems } from './component-items.js';
export { toSet } from './to-set.js';
export { toValue } from './to-value.js';
declare const component: import("./component.js").Make;
declare const fromKeyed: <K, T>(read: (key: K) => T, watch: (listener: (keys?: readonly K[]) => void) => () => void) => (key: K) => T;
declare const fromTest: <K>(test: import("./from-test.js").Test<K>) => (key: K) => boolean;
declare const fromWatched: <T>(watched: Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>) => import("solid-js").Accessor<T>;
declare const Interact: (props: import("./interact.js").InteractProps) => import("./adapter.js").SolidElement;
declare const toDrawn: <K>(accessor: import("solid-js").Accessor<readonly K[]>) => import("./to-drawn.js").Drawn<K>;
declare const toWatched: <T>(accessor: import("solid-js").Accessor<T>) => import("./to-watched.js").Watched<T>;
/**
 * A modal dialog around a content widget: the WAI-ARIA modal dialog
 * (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), shown over everything else in an overlay. `open` is
 * always the app's, by the contract's rule: Escape (one the content didn't take, heard as it bubbles from the
 * content), the close button, and a press outside the dialog (on the overlay, unless `ignoreOutside`) close it
 * at once, pending, and emit `change` with `false`; the props confirm it, or `refused` opens it again. A press
 * outside closes it once it is released there, so what is under the overlay never takes the click. Opening
 * focuses the part the app names. Keeping focus inside while open, and giving it back on close, is what
 * `aria-modal` asks of the host.
 */
declare const dialog: <Content extends import("./component.js").AnyComponent>(content: Content, initialFocus: Parameters<typeof import("@pterror/interact-core").dialog>[1]) => import("./component.js").Component<import("./component.js").Own<import("./widgets/dialog.js").WidgetProps, 'open', import("./widgets/dialog.js").WidgetProps['open'], never, Readonly<{
    content: import("./component.js").OwnOf<Content>;
}>, never>, 'close' | 'dialog' | 'root' | 'title' | import("./component.js").PartsInside<Content, 'content'>>;
/**
 * A listbox over a collection the host holds (on a server, say): the WAI-ARIA listbox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single selection, selection not following focus. It draws
 * a window of `rows` options and holds one more key each side of it, so every drawn option's neighbours are
 * known. Keys come from the host by `ask` about its `source`; only the answer to the latest ask is used, and
 * `changed` asks again. The window follows the active option, and, once an option's size is `measured`, the
 * list's `scroll` offset. Characters typed are typeahead: the host finds the option they start (`ask` with
 * `find`), and only the answer to the latest find is used. Shown with nothing selected and nothing active, or
 * focused so, the first option is active. Given a visible label outside it (`label`), it is named by it. With
 * `hover`, the option under the pointer becomes active. Selection is the value, by the contract's rule: with
 * `selected` in its props (not `null`), a choice shows at once and is pending until the props confirm it or the
 * app refuses it. The list emits `active` whenever the active option it draws changes, so a parent can name it
 * (`aria-activedescendant`) without reading the list's state.
 */
declare const List: import("./component.js").Component<import("./widgets/list.js").ListProps, import("./widgets/list.js").ListParts>;
/**
 * A menu button: the WAI-ARIA menu button with a menu (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/),
 * the menu a popup against the button, focus moved to each item in turn. Items are the keys of a collection the
 * host holds (`source`), asked for whole, since a menu draws every item: a first page, then the rest once the
 * count is known; only the answer to the latest ask is used, and `changed` asks again. The host draws each item.
 * Characters typed are typeahead, which the host finds (`ask` with `find`). Choosing an item emits `activate`;
 * disabled items are moved to but not chosen.
 */
declare const Menu: import("./component.js").Component<import("./widgets/menu.js").MenuProps, import("./widgets/menu.js").MenuParts>;
/**
 * A listbox whose options can be reordered, by dragging with a pointer or by Alt+ArrowUp and Alt+ArrowDown on
 * the active option, as in the WAI-ARIA listbox with rearrangeable options
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/). It is the list with its
 * step and view wrapped: what it handles first is the drag and the move keys, and everything else is the list's.
 * The order is the collection's, by the contract's rule: a move shows at once, is emitted as `move` with an id,
 * and stays pending, applied over the keys the host answers with, until the host has it (`confirmed`, then the
 * next answer holds it) or refuses it (`refused`, which undoes it). Every move is made against the order shown,
 * pending moves included. ARIA has no word for a dragged item or a drop place (`aria-grabbed` and
 * `aria-dropeffect` are deprecated), so they are `data` states, and a move is announced. A drag starts once the
 * pointer has moved `dragDistance` (in the target's units) from where it was pressed, and lands by which option
 * the pointer is over: after it when that option is later than the dragged one, before it when earlier.
 */
declare const ReorderList: import("./component.js").Component<import("./widgets/reorder-list.js").ReorderListProps, import("./widgets/reorder-list.js").ReorderListParts>;
/**
 * A select: the WAI-ARIA select-only combobox
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), a trigger and a list, the
 * list in a popup against the trigger. Focus stays on the trigger, which names the active option by
 * `aria-activedescendant`, known from the list's `active` effects; the list is the windowed `list`, given the
 * select's value as its own, so it only reports what was chosen. The value follows the contract's rule: with
 * `value` in its props, a choice shows at once and is pending until the props confirm it or the app refuses it.
 * A character typed opens it and is the list's typeahead; Space is typed too while a prefix is being typed
 * (`until`). Given a visible label outside it (`label`), the trigger and the list are named by it, and a click
 * on it focuses the trigger. A mouse press on the trigger opens (or closes) it at once, and its release over an
 * option chooses that option, as a native select does; the click the press ends in is then not a toggle
 * (`pressed`). The option under the pointer is active.
 */
declare const Select: import("./component.js").Component<import("./widgets/select.js").SelectProps, import("./widgets/select.js").SelectParts>;
export { component, fromKeyed, fromTest, fromWatched, Interact, toDrawn, toWatched, dialog, List, Menu, ReorderList, Select, };
