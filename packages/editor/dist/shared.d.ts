/**
 * Where two texts differ: the length they share at the start, and at the end, in UTF-16 code units as positions in
 * a text are
 * @param {string} was - One
 * @param {string} now - The other
 * @returns {Readonly<{ start: number, end: number }>} The shared lengths, never overlapping in either text
 */
declare function shared(was: string, now: string): Readonly<{
    start: number;
    end: number;
}>;
export { shared };
