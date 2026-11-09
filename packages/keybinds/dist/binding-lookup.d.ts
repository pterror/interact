/**
 * A whole binding's normal form through one input, whatever syntax it uses: equal for two bindings that trigger the
 * same way ("Ctrl+K:UP" and "ctrl+k:up"). Each step goes through the input's parser with the binding's suffix.
 */
/**
 * A binding's normal form
 * @param {(step: string, suffix: string) => Readonly<{ lookup: string }>} parse - One step through the input's
 *   parser: keyParse (with its syntax), mouseParse, padParse
 * @returns {(binding: string) => string} The binding's steps' lookups, then its suffix
 * @throws {Error} From the function it returns, if the binding doesn't parse
 */
declare function bindingLookup(parse: (step: string, suffix: string) => Readonly<{
    lookup: string;
}>): (binding: string) => string;
export { bindingLookup };
