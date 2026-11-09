/**
 * Changing a person's bindings, one edit at a time, each one write: putting a binding in a slot (in place of one, or
 * added), taking one away, putting one in place of another id's same binding, and resetting an id or all to the
 * defaults. What is kept for an id is only the fields that differ from its defaults (changedFields()).
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Fields = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Overrides = Readonly<Record<string, Fields>>;
export type Slot = Readonly<{
    id: string;
    field: Field;
    index?: number | undefined;
}>;
export type RebindOptions = Readonly<{
    schema: Readonly<Record<string, Fields>>;
    overrides: Readonly<{
        get: () => Overrides;
        watch: (listener: () => void) => () => void;
        set: (overrides: Overrides) => void;
    }>;
}>;
/**
 * Edits over a person's overrides
 * @param {RebindOptions} options - The defaults, by id; and the overrides (bindingStore())
 * @returns {Readonly<{
 *   bindings: Readonly<{ get: () => Readonly<Record<string, Fields>>, watch: (listener: () => void) => () => void }>,
 *   changed: (id: string) => boolean,
 *   put: (slot: Slot, binding: string) => void,
 *   remove: (slot: Slot) => void,
 *   replace: (slot: Slot, binding: string, from: string, same: (binding: string) => boolean) => void,
 *   reset: (id: string) => void,
 *   resetAll: () => void,
 * }>} The bindings in effect; whether an id's differ from its defaults; putting a binding in a slot; taking a slot's
 *   away; putting one in a slot and taking from another id every binding in the slot's field that is the same; and
 *   resetting
 */
declare function rebind({ overrides, schema }: RebindOptions): Readonly<{
    bindings: Readonly<{
        get: () => Readonly<Record<string, Fields>>;
        watch: (listener: () => void) => () => void;
    }>;
    changed: (id: string) => boolean;
    put: (slot: Slot, binding: string) => void;
    remove: (slot: Slot) => void;
    replace: (slot: Slot, binding: string, from: string, same: (binding: string) => boolean) => void;
    reset: (id: string) => void;
    resetAll: () => void;
}>;
export { rebind };
