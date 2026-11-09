/**
 * Opening a cheatsheet with a modifier on its own: open while it is held a while, until let go; tapped twice, open until
 * tapped twice again or closed otherwise.
 */
export type CheatsheetTriggerOptions = Readonly<{
    open: Readonly<{
        get: () => boolean;
        watch: (listener: () => void) => () => void;
    }>;
    to: (open: boolean) => void;
    modifier?: string | undefined;
    delay?: number | undefined;
    target?: EventTarget | undefined;
}>;
/**
 * Follows the modifier
 * @param {CheatsheetTriggerOptions} options - Whether the cheatsheet is open; setting it; the modifier ("$mod", the
 *   default, is Meta on a Mac and Control elsewhere; or "Control", "Alt", "Shift", "Meta"); how long a hold takes, in
 *   ms (default 1000); and where to listen (default the window)
 * @returns {() => void} Stopping
 */
declare function cheatsheetTrigger({ delay, modifier, open, target, to }: CheatsheetTriggerOptions): () => void;
export { cheatsheetTrigger };
