/**
 * A ready-made settings panel, wired from small pieces: a row per id not hidden, grouped by category under a header
 * row, with its bindings through each input (an axis's through the axis input, a command's through the others); a
 * binding is recorded from what is done next, asks before taking another id's, and can be removed; an id, or all,
 * resets to its defaults. Each edit is one write to the overrides, of only the fields that differ. Unstyled, in the
 * light DOM: a Reset all button (`data-keybinds=reset-all`), then the groups (`role=group`, labelled by their
 * header); each piece names itself in `data-keybinds`. It is no overlay: an app shows it in its own dialog. An app
 * that wants one piece otherwise wires the rest itself: settingsKeys() (which ids), settingsRow() (a row),
 * settingsChip(), settingsPrompt(), settingsQuestion() (its parts), rebind() (the edits), conflictQuestion() (asking),
 * recording() and settingsRecorder() (recording), categoryHeaders(), the inputs (rebindKeys(), ...), with list's
 * render and groupMount.
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
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
export type RecordOptions = Readonly<{
    done: (binding: string) => void;
    release: boolean;
    ignore: (event: Event) => boolean;
}>;
export type Input = Readonly<{
    field: Field;
    label: string;
    prompt: (release: boolean) => string;
    record: (options: RecordOptions) => () => void;
    lookup: (binding: string) => string;
    parts: (binding: string) => readonly string[];
    available?: () => boolean;
    watch?: (listener: () => void) => () => void;
}>;
export type Slot = Readonly<{
    id: string;
    field: Field;
    index?: number | undefined;
}>;
export type SettingsOptions = Readonly<{
    element: HTMLElement;
    schema: Readonly<Record<string, Entry>>;
    overrides: Readonly<{
        get: () => Overrides;
        watch: (listener: () => void) => () => void;
        set: (overrides: Overrides) => void;
    }>;
    inputs: readonly Input[];
    releases?: boolean;
    holds?: boolean;
    sequences?: boolean;
    pause?: number;
}>;
/**
 * Builds a settings panel in an element
 * @param {SettingsOptions} options - Its element; the schema; a person's overrides (bindingStore()); the inputs shown
 *   and recorded (rebindKeys(), rebindMouse(), rebindPad(), rebindAxes()); which syntax can be recorded, as
 *   keybinds() has it on: releases (":up"), holds (":hold", ":tap"), sequences ("g i"); and how long a pause takes
 *   the steps so far, as for recording()
 * @returns {() => void} Stopping, and taking out what it put in the element
 * @example
 * const stop = settings({ element, inputs: [rebindKeys(), rebindMouse()], overrides, schema })
 */
declare function settings({ element, holds, inputs, overrides, pause, releases, schema, sequences }: SettingsOptions): () => void;
export { settings };
