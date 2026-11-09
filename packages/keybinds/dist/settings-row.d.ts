/**
 * A settings panel row's contents, as a facet: the id's label; its bindings through each of its inputs (a chip each,
 * or the prompt in place of the one being recorded, and the question after the slot it is about), then the prompt
 * and question for a new binding; a button per input that can be recorded now, which records a new one ("+ Key",
 * `data-keybinds=add`), left out while the row records; and Reset (`data-keybinds=reset`, `aria-disabled` while
 * nothing differs). A row whose bindings differ from its defaults is `data-changed`. Header rows are left as they
 * were made.
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Slot = Readonly<{
    id: string;
    field: Field;
    index?: number | undefined;
}>;
export type Header = Readonly<{
    category: string;
}>;
export type Entry = Readonly<{
    label: string;
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Input = Readonly<{
    field: Field;
    label: string;
    available?: () => boolean;
}>;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type SettingsRowOptions<R extends Readonly<{
    slot: Slot;
}>, Q> = Readonly<{
    entryOf: (id: string) => Entry | undefined;
    inputsOf: (id: string) => readonly Input[];
    changed: (id: string) => boolean;
    recording: Watched<R | undefined>;
    question: Watched<(Q & Readonly<{
        slot: Slot;
    }>) | undefined>;
    chip: (slot: Slot, binding: string) => Element;
    prompt: (recorded: R) => Element;
    ask: (question: Q) => Element;
    record: (slot: Slot) => void;
    reset: (id: string) => void;
    watch: (listener: () => void) => () => void;
}>;
/**
 * Fills rows
 * @template {Readonly<{ slot: Slot }>} R, Q
 * @param {SettingsRowOptions<R, Q>} options - An id's bindings in effect (and label); its inputs; whether its
 *   bindings differ from its defaults; what is being recorded (recording()); the question asked (conflictQuestion());
 *   a binding's chip, the prompt and the question as elements; recording a slot; resetting an id; and hearing what
 *   every row shows change
 * @returns {Readonly<{ apply: (key: string | Header, element: Element) => void,
 *   watch: (listener: (keys?: readonly (string | Header)[]) => void) => () => void }>} The facet
 */
declare function settingsRow<R extends Readonly<{
    slot: Slot;
}>, Q>({ ask, changed, chip, entryOf, inputsOf, prompt, question, record, recording, reset, watch }: SettingsRowOptions<R, Q>): Readonly<{
    apply: (key: string | Header, element: Element) => void;
    watch: (listener: (keys?: readonly (string | Header)[]) => void) => () => void;
}>;
export { settingsRow };
