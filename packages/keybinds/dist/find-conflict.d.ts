/**
 * Which id a binding is already bound to: the first, other than the one being rebound, with a binding in the same
 * field that has the same normal form. A binding that doesn't parse conflicts with nothing, and is the same as nothing.
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Entry = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Candidate = Readonly<{
    binding: string;
    field: Field;
    lookup: (binding: string) => string;
    except?: string;
}>;
/**
 * The id a binding would conflict with
 * @param {Readonly<Record<string, Entry>>} bindings - The bindings in effect, by id (bound()'s)
 * @param {Candidate} candidate - The binding; its field; its normal form through that field's input (bindingLookup()
 *   of the input's parser, or an axis's lookup); and the id not to check, usually the one being rebound
 * @returns {string | undefined} The id it is already bound to, if any
 */
declare function findConflict(bindings: Readonly<Record<string, Entry>>, { binding, except, field, lookup }: Candidate): string | undefined;
export { findConflict };
