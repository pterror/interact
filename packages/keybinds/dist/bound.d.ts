/**
 * The bindings in effect: each id of a schema with a person's override laid over it, each field the override sets in
 * place of the schema's. An override for an id the schema hasn't is left out; an id with no override keeps its
 * schema entry as it is.
 */
export type Field = 'axes' | 'keys' | 'mouse' | 'pad';
export type Rebindable = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
export type Bound<E extends Rebindable> = Readonly<Omit<E, Field>> & Rebindable;
/**
 * Each id's bindings in effect
 * @template {Rebindable} E
 * @param {Readonly<Record<string, E>>} schema - The defaults, by id
 * @param {Readonly<Record<string, Rebindable>>} overrides - A person's changes, by id
 * @returns {Readonly<Record<string, Bound<E>>>} The bindings in effect, by id, in the schema's order
 */
declare function bound<E extends Rebindable>(schema: Readonly<Record<string, E>>, overrides: Readonly<Record<string, Rebindable>>): Readonly<Record<string, Bound<E>>>;
export { bound };
