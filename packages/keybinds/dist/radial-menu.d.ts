/**
 * A ready-made radial menu, wired from small pieces: up to eight items evenly around a point, so each direction
 * becomes muscle memory. While open it is a manual popover (`role=menu`) centred on the point, that has focus, so by
 * the overlay rule the page's bindings don't fire; its own keys are bound on it: arrows point at a slot (or the filled
 * one nearest), Tab and Shift+Tab go round, Enter and Space run the active item. Resting the pointer on an item makes
 * it active, a click runs it, Escape or a press outside closes the menu, and focus goes back where it was. An item
 * whose `when` doesn't hold is `aria-disabled` and doesn't run; the active item is `data-active`. Unstyled, in the
 * light DOM: the only inline style is geometry, the popover's place, the element's size (the box that holds the
 * slots) and each slot's place in it from radialPlace(). An app that wants one piece otherwise wires the rest itself:
 * radialPlace(), radialStep(), focusReturn(), with list's render, place, mark, ids, activeDescendant, move, pick,
 * hoverIntent, popover, focusWhen and dismiss.
 */
export type Item = Readonly<{
    label: string;
    run: () => void;
    when?: () => boolean;
}>;
export type Point = Readonly<{
    x: number;
    y: number;
}>;
export type RadialMenuOptions = Readonly<{
    element: HTMLElement;
    items: () => readonly Item[];
    radius?: number;
    size?: number;
    rest?: number;
}>;
/**
 * Builds a radial menu in an element
 * @param {RadialMenuOptions} options - Its element; its items (the first eight are shown, read each time it opens);
 *   the circle's radius and each slot's size, as for radialPlace(); and how long the pointer rests on an item to make
 *   it active, as for hoverIntent()
 * @returns {Readonly<{ openAt: (point?: Point) => void, close: () => void,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>, stop: () => void }>}
 *   Opening it around a point (default the viewport's centre), afresh if it is open; closing it; whether it is open; and stopping
 */
declare function radialMenu({ element, items, radius, rest, size }: RadialMenuOptions): Readonly<{
    openAt: (point?: Point) => void;
    close: () => void;
    open: Readonly<{
        get: () => boolean;
        watch: (listener: () => void) => () => void;
    }>;
    stop: () => void;
}>;
export { radialMenu };
