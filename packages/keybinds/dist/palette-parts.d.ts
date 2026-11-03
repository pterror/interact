/**
 * The palette's markup, which keys move through its matches, and $mod+K toggling it.
 */
declare const PLACEHOLDER = "Type a command...";
/**
 * Which keys in the search field move the active match, and where
 * @type {ReadonlyMap<string, 'down' | 'end' | 'home' | 'up'>}
 */
declare const MOVES: ReadonlyMap<string, 'down' | 'end' | 'home' | 'up'>;
/**
 * The palette's markup: a backdrop, and a dialog holding the search field and the list of matches
 * @returns {Readonly<{ backdrop: HTMLDivElement, input: HTMLInputElement, list: HTMLUListElement, root: HTMLDivElement }>} The
 *   palette, and the parts it listens to
 */
declare function paletteMarkup(): Readonly<{
    backdrop: HTMLDivElement;
    input: HTMLInputElement;
    list: HTMLUListElement;
    root: HTMLDivElement;
}>;
/**
 * Makes $mod+K (Cmd on Mac, Ctrl elsewhere) open and close something, anywhere in the page
 * @param {Readonly<{ toggle: () => void }>} target - What opens and closes
 * @returns {() => void} A function that stops
 */
declare function toggleOnModK(target: Readonly<{
    toggle: () => void;
}>): () => void;
export { MOVES, PLACEHOLDER, paletteMarkup, toggleOnModK };
