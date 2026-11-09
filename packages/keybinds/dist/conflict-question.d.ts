/**
 * Asking before a binding takes another id's: a binding offered for a slot goes in, unless another id has the same
 * binding in that field, which waits as the question until it is accepted (the other id's goes, this one goes in) or
 * cancelled. One question at a time; a new offer replaces it.
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Fields = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Slot = Readonly<{
    id: string;
    field: Field;
    index?: number | undefined;
}>;
export type Question = Readonly<{
    slot: Slot;
    binding: string;
    taken: string;
}>;
export type ConflictQuestionOptions = Readonly<{
    bindings: Readonly<{
        get: () => Readonly<Record<string, Fields>>;
    }>;
    lookupOf: (field: Field) => (binding: string) => string;
    put: (slot: Slot, binding: string) => void;
    replace: (slot: Slot, binding: string, from: string, same: (binding: string) => boolean) => void;
}>;
/**
 * The question, as state
 * @param {ConflictQuestionOptions} options - The bindings in effect; a field's normal form (its input's lookup);
 *   putting a binding in a slot; and putting one in a slot in place of another id's same ones (rebind()'s)
 * @returns {Readonly<{ get: () => Question | undefined, watch: (listener: () => void) => () => void,
 *   offer: (slot: Slot, binding: string) => void, accept: () => void, cancel: () => void }>} The question asked now;
 *   hearing it change; offering a binding; and answering
 */
declare function conflictQuestion({ bindings, lookupOf, put, replace }: ConflictQuestionOptions): Readonly<{
    get: () => Question | undefined;
    watch: (listener: () => void) => () => void;
    offer: (slot: Slot, binding: string) => void;
    accept: () => void;
    cancel: () => void;
}>;
export { conflictQuestion };
