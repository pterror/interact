/**
 * A text field's value, read, set and heard: heard as the person types (`input`), and as it is set here. A value set on
 * the element directly, which no event announces, isn't heard.
 */
/**
 * The field's value
 * @param {Readonly<{ field: HTMLInputElement }>} options - The field
 * @returns {Readonly<{ get: () => string, set: (value: string) => void, watch: (listener: () => void) => () => void }>}
 *   Its value now; setting it, which its listeners hear; and hearing it change
 */
declare function textValue({ field }: Readonly<{
    field: HTMLInputElement;
}>): Readonly<{
    get: () => string;
    set: (value: string) => void;
    watch: (listener: () => void) => () => void;
}>;
export { textValue };
