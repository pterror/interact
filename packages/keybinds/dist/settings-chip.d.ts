/**
 * A binding as a settings panel shows it, a `data-keybinds=binding` span: a button of its display parts as `<kbd>`s,
 * which records it again; an Invert switch, for an axis (`data-keybinds=invert`); a Release switch, only for a
 * release (`data-keybinds=release`, on), which turns it back into a press **(P)**; and a button that removes it
 * (`data-keybinds=remove`). A switch is `aria-pressed`; what it switches to is offered, as a recorded binding is.
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Slot = Readonly<{
    id: string;
    field: Field;
    index?: number | undefined;
}>;
export type SettingsChipOptions = Readonly<{
    parts: (slot: Slot, binding: string) => readonly string[];
    record: (slot: Slot) => void;
    remove: (slot: Slot) => void;
    offer: (slot: Slot, binding: string) => void;
}>;
/**
 * Makes chips
 * @param {SettingsChipOptions} options - A binding's display parts; recording a slot again; removing its binding;
 *   and offering a binding for it
 * @returns {(slot: Slot, binding: string) => HTMLElement} A binding's chip
 */
declare function settingsChip({ offer, parts, record, remove }: SettingsChipOptions): (slot: Slot, binding: string) => HTMLElement;
export { settingsChip };
