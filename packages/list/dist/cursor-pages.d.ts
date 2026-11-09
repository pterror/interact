/**
 * A list read a page at a time after a cursor, with no ranks or total of its own: ranks count the pages read so far.
 * It holds one run of consecutive pages and keeps every page's cursor and size, so a dropped page is read again by its
 * cursor. Only the answer to the latest question is used.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type Page<K, C> = Readonly<{
    cursor: C | undefined;
    keys: readonly K[];
    next: C | undefined;
}>;
export type Pages<K, C> = Readonly<{
    read: (from: C | undefined, count: number) => Promise<readonly Page<K, C>[]>;
    watch: (listener: () => void) => () => void;
}>;
export type CursorPages<K> = Readonly<{
    keysAt: (from: number, to: number) => Promise<readonly K[]>;
    watch: (listener: () => void) => () => void;
    locate: (key: K) => Promise<number | undefined>;
    step: (key: K | undefined, by: number) => Promise<K | undefined>;
    count: Watched<number>;
    ended: Watched<boolean>;
}>;
export type Known<C> = Readonly<{
    cursor: C | undefined;
    size: number;
    next: C | undefined;
}>;
export type Run = Readonly<{
    start: number;
    count: number;
}>;
export type Question<K> = Readonly<{
    from: number;
    to: number;
    answer: (keys: readonly K[]) => void;
}>;
/**
 * Reads a list by its pages' cursors
 * @template K, C
 * @param {Pages<K, C>} pages - The source of pages
 * @returns {CursorPages<K>} The list as ranks
 */
declare function cursorPages<K, C>(pages: Pages<K, C>): CursorPages<K>;
export { cursorPages };
