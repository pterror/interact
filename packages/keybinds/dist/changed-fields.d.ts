/**
 * What to keep as one id's override: the fields of its bindings that differ from its defaults. None differing is an
 * empty override, which is no override.
 */
export type Fields = Readonly<{
    keys?: readonly string[];
    mouse?: readonly string[];
    pad?: readonly string[];
    axes?: readonly string[];
}>;
/**
 * The fields that differ
 * @param {Fields} defaults - The id's defaults
 * @param {Fields} bindings - Its bindings now; a field left out is as the defaults have it
 * @returns {Fields} Each field of `bindings` whose list isn't the defaults' (a field the defaults lack is an empty
 *   list)
 */
declare function changedFields(defaults: Fields, bindings: Fields): Fields;
export { changedFields };
