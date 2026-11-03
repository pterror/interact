/**
 * Opening the cheatsheet by holding a modifier on its own: it shows while the modifier is held, tapping the modifier
 * twice keeps it open, and tapping twice again, Escape or a click outside closes it.
 */
export type Sheet = Readonly<{
    close: () => void;
    isOpen: () => boolean;
    onClose: (closed: () => void) => () => void;
    setOpen: (open: boolean) => void;
}>;
/**
 * Starts opening a sheet by holding a modifier
 * @param {Sheet} sheet - What opens
 * @param {Readonly<{ delay: string | null, key: string | null }>} attributes - The `trigger-key` and `trigger-delay`
 *   attributes
 * @returns {() => void} A function that stops
 */
declare function holdToOpen(sheet: Sheet, { delay, key }: Readonly<{
    delay: string | null;
    key: string | null;
}>): () => void;
export { holdToOpen };
