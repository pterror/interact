/**
 * Moving a key through a list, by steps the list answers, now or later. Moves made while one is under way queue, each
 * from the one before's result; a change to the key from anywhere else drops what is queued.
 */
export type MoveOptions<K> = Readonly<{
    from: () => K | undefined;
    step: (from: K | undefined, by: number) => Promise<K | undefined>;
    to: (key: K | undefined) => void;
}>;
export type Move = Readonly<{
    by: (n: number) => Promise<void>;
    edge: (n: number) => Promise<void>;
}>;
/**
 * What a move needs: the key now, the key `n` on from another (none: from an edge), and setting the key
 * @template K
 * @typedef {Readonly<{
 *   from: () => K | undefined,
 *   step: (from: K | undefined, by: number) => Promise<K | undefined>,
 *   to: (key: K | undefined) => void,
 * }>} MoveOptions
 */
/**
 * Moves: `by(n)` moves the key `n` on (back, if negative), `edge(n)` moves it to the key `n` from an edge (1: the
 * first, -1: the last). Each resolves when its move is made or dropped, and rejects if its step fails
 * @typedef {Readonly<{ by: (n: number) => Promise<void>, edge: (n: number) => Promise<void> }>} Move
 */
/**
 * Moving a key
 * @template K
 * @param {MoveOptions<K>} options - The key now, the steps, and setting the key
 * @returns {Move} The moves
 */
declare function move<K>({ from, step, to }: MoveOptions<K>): Move;
export { move };
