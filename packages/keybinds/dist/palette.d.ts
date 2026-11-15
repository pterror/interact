/**
 * A ready-made command palette, wired from small pieces: a field and the commands that apply now, filtered as the
 * person types (list's combobox, case 5). It opens empty with the first command active; Up and Down move the active
 * command (wrapping at the ends), Enter or a click runs it, and the pointer resting on one makes it active. Running a
 * command closes the palette first and gives focus back where it was, so the command runs where the person was. While
 * open it is a manual popover centred on the viewport, holding focus in its field, so by the overlay rule the page's
 * bindings don't fire; Escape or a press outside closes it. It reads no key to open: the app opens it from a command
 * it binds. Unstyled, in the light DOM: the element is a `role=dialog` holding a `role=combobox` field and a
 * `role=listbox`, whose options each hold the command's label and its bindings as `kbd`s; the active option is
 * `data-active` and `aria-selected=true`. An app that wants one piece otherwise wires the rest itself: list's
 * textValue, filtered, render, flowMount, ids, mark, reveal, activeDescendant, move, wrapStep, hoverIntent, popover,
 * focusWhen and dismiss, with cheatsheetRow(), bindingParts() and focusReturn().
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
export type PaletteOptions = Readonly<{
    element: HTMLElement;
    commands: () => readonly Command[];
    matches?: (command: Command, query: string) => boolean;
    label?: string;
    placeholder?: string;
    layout?: Readonly<{
        get: () => ReadonlyMap<string, string> | undefined;
    }>;
    rest?: number;
}>;
/**
 * Builds a command palette in an element
 * @param {PaletteOptions} options - Its element; its commands (those that apply are read each time it opens); whether
 *   a command matches what is typed (default: every word is in its label); the dialog's label and the field's
 *   placeholder; the person's keyboard layout (layout()), for how bindings are shown; and how long the pointer rests on
 *   a command to make it active, as for hoverIntent()
 * @returns {Readonly<{ open: Readonly<{ get: () => boolean, set: (open: boolean) => void,
 *   watch: (listener: () => void) => () => void }>, stop: () => void }>} Whether it is open, and opening and closing
 *   it; and stopping
 * @example
 * const commands = [{ id: 'save', keys: ['$mod+s'], label: 'Save', run: save }]
 * const shown = palette({ commands: () => commands, element })
 * keybinds([...commands, { keys: ['$mod+k'], run: () => shown.open.set(true) }])
 */
declare function palette({ commands, element, label, layout, matches, placeholder, rest, }: PaletteOptions): Readonly<{
    open: Readonly<{
        get: () => boolean;
        set: (open: boolean) => void;
        watch: (listener: () => void) => () => void;
    }>;
    stop: () => void;
}>;
export { palette };
