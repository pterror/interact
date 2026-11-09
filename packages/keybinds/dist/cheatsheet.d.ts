/**
 * A ready-made cheatsheet, wired from small pieces: every binding in effect, grouped by category under a header row,
 * those whose command doesn't apply now marked `aria-disabled`, shown while a modifier is held or after it is tapped
 * twice, and closed by Escape or a press outside. While open it is a manual popover centred on the viewport, that
 * has focus (given back as it closes), so by the overlay rule the page's bindings don't fire. Unstyled, in the light
 * DOM: each group is a `role=group` labelled by its header; the only inline style is the popover's place. An app that
 * wants one piece otherwise wires the rest itself: cheatsheetKeys() (which ids), bindingParts() (how bindings look),
 * cheatsheetRow() (a row's contents), cheatsheetTrigger() (when it opens), categoryHeaders(), focusReturn(), with list's
 * render, groupMount, mark, popover, focusWhen and dismiss.
 */
export type Entry = Readonly<{
    label: string;
    category?: string;
    hidden?: boolean;
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Overrides = Readonly<Record<string, Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>>>;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type CheatsheetOptions = Readonly<{
    element: HTMLElement;
    schema: Readonly<Record<string, Entry>>;
    overrides?: Watched<Overrides>;
    applies?: (id: string) => boolean;
    layout?: Watched<ReadonlyMap<string, string> | undefined>;
    modifier?: string;
    delay?: number;
    target?: EventTarget;
}>;
/**
 * Builds a cheatsheet in an element
 * @param {CheatsheetOptions} options - Its element; the schema, and a person's overrides (bindingStore()); whether an
 *   id's command applies now (default: all do); the person's keyboard layout (layout()); and its trigger, as for
 *   cheatsheetTrigger()
 * @returns {Readonly<{ open: Readonly<{ get: () => boolean, set: (open: boolean) => void,
 *   watch: (listener: () => void) => () => void }>, stop: () => void }>} Whether it is open, and stopping
 * @example
 * const sheet = cheatsheet({ element, overrides: bindingStore(localStorageBindings('app:keys')), schema })
 */
declare function cheatsheet({ applies, delay, element, layout, modifier, overrides, schema, target, }: CheatsheetOptions): Readonly<{
    open: Readonly<{
        get: () => boolean;
        set: (open: boolean) => void;
        watch: (listener: () => void) => () => void;
    }>;
    stop: () => void;
}>;
export { cheatsheet };
