/**
 * A cheatsheet row's contents, as a facet: its label, then each binding as a span of `<kbd>`s, one per display part.
 * Header rows are left as they were made.
 */
export type Header = Readonly<{
    category: string;
}>;
export type Entry = Readonly<{
    label: string;
}>;
export type CheatsheetRowOptions<E extends Entry> = Readonly<{
    entryOf: (id: string) => E | undefined;
    parts: (entry: E) => readonly (readonly string[])[];
    watch: (listener: () => void) => () => void;
}>;
/**
 * Fills rows
 * @template {Entry} E
 * @param {CheatsheetRowOptions<E>} options - An id's entry; its bindings as display parts; and hearing either change
 * @returns {Readonly<{ apply: (key: string | Header, element: Element) => void,
 *   watch: (listener: () => void) => () => void }>} The facet
 */
declare function cheatsheetRow<E extends Entry>({ entryOf, parts, watch }: CheatsheetRowOptions<E>): Readonly<{
    apply: (key: string | Header, element: Element) => void;
    watch: (listener: () => void) => () => void;
}>;
export { cheatsheetRow };
