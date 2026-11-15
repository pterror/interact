/**
 * A ready-made right-click menu, wired from small pieces: the commands it is opened with, as a menu at a point or
 * against an element (list's menu, case 4). It opens with the first command active and focus on it; Up and Down move
 * the active command (wrapping at the ends), Home and End go to the ends, Enter, Space or a click runs it, and the
 * pointer resting on one makes it active. A command whose `when` doesn't hold as the menu opens is `aria-disabled` and
 * doesn't run. Running a command closes the menu first and gives focus back where it was, and runs it if it applies there. While open it is a manual popover, kept
 * inside the window, that has focus, so by the overlay rule the page's bindings don't fire; Escape or a press outside
 * closes it. It reads no event to open: the app opens it from a command it binds (`RightClick`, `shift+F10`).
 * Unstyled, in the light DOM: the element is `role=menu`, each item a `role=menuitem` holding the command's label and
 * its bindings as `kbd`s, the active one `data-active`. An app that wants one piece otherwise wires the rest itself:
 * list's arrayList, render, flowMount, ids, mark, activeDescendant, move, wrapStep, hoverIntent, popover, focusWhen
 * and dismiss, with cheatsheetRow(), bindingParts() and focusReturn().
 */
export type Command = Readonly<{
    id: string;
    label: string;
    run: (event: Event) => boolean | void;
    when?: () => boolean;
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
}>;
export type Anchor = Readonly<{
    getBoundingClientRect: () => Readonly<{
        left: number;
        top: number;
        right: number;
        bottom: number;
    }>;
}>;
export type ContextMenuOptions = Readonly<{
    element: HTMLElement;
    label?: string;
    layout?: Readonly<{
        get: () => ReadonlyMap<string, string> | undefined;
    }>;
    rest?: number;
}>;
/**
 * Builds a right-click menu in an element
 * @param {ContextMenuOptions} options - Its element; its label; the person's keyboard layout (layout()), for how
 *   bindings are shown; and how long the pointer rests on a command to make it active, as for hoverIntent()
 * @returns {Readonly<{ openAt: (anchor: Anchor, commands: readonly Command[]) => void, close: () => void,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>, stop: () => void }>}
 *   Opening it with commands below a point or an element (afresh if it is open; with none, it stays closed); closing
 *   it; whether it is open; and stopping
 * @example
 * const menu = contextMenu({ element })
 * keybinds([{ mouse: ['RightClick'], run: (event) => menu.openAt(pointOf(event), messageCommands) }])
 */
declare function contextMenu({ element, label, layout, rest }: ContextMenuOptions): Readonly<{
    openAt: (anchor: Anchor, commands: readonly Command[]) => void;
    close: () => void;
    open: Readonly<{
        get: () => boolean;
        watch: (listener: () => void) => () => void;
    }>;
    stop: () => void;
}>;
export { contextMenu };
