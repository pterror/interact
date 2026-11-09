/**
 * Ids drawn under a header row per category, as render draws them with groupMount: each header's key and row (a
 * `role=presentation` element with the category as its text and an id that labels its group), and the group of each
 * key drawn.
 */
export type Header = Readonly<{
    category: string;
}>;
export type CategoryHeadersOptions = Readonly<{
    drawn: Readonly<{
        keys: () => readonly string[];
        watch: (listener: () => void) => () => void;
    }>;
    categoryOf: (id: string) => string;
    prefix: string;
}>;
/** @typedef {Readonly<{ category: string }>} Header */
/**
 * @typedef {Readonly<{
 *   drawn: Readonly<{ keys: () => readonly string[], watch: (listener: () => void) => () => void }>,
 *   categoryOf: (id: string) => string,
 *   prefix: string,
 * }>} CategoryHeadersOptions
 */
/**
 * Headers over ids grouped by category
 * @param {CategoryHeadersOptions} options - The ids, those of a category together; each id's category; and what
 *   the headers' element ids start with, unique in the page
 * @returns {Readonly<{
 *   drawn: Readonly<{ keys: () => readonly (string | Header)[], watch: (listener: () => void) => () => void }>,
 *   groupOf: (key: string | Header) => string,
 *   labelIdOf: (category: string) => string,
 *   header: (key: string | Header) => Element | undefined,
 * }>} The ids with headers; each key's category; the id of a category's header row; and a header key's row (none
 *   for an id)
 */
declare function categoryHeaders({ categoryOf, drawn, prefix }: CategoryHeadersOptions): Readonly<{
    drawn: Readonly<{
        keys: () => readonly (string | Header)[];
        watch: (listener: () => void) => () => void;
    }>;
    groupOf: (key: string | Header) => string;
    labelIdOf: (category: string) => string;
    header: (key: string | Header) => Element | undefined;
}>;
export { categoryHeaders };
