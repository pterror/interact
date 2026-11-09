/**
 * The keys to draw for a list too long to draw whole: those in view, a screen more each way, and every key kept
 * (the active one), wherever it is. Answers may come late; only the answer to the latest question is used.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type KeysAt<K> = Readonly<{
    keysAt: (from: number, to: number) => Promise<readonly K[]>;
    watch: (listener: () => void) => () => void;
}>;
export type WindowingOptions<K> = Readonly<{
    ranks: Watched<Readonly<{
        from: number;
        to: number;
    }>>;
    keysAt: KeysAt<K>;
    keep: Watched<readonly K[]>;
    locate: (key: K) => Promise<number | undefined>;
}>;
export type Windowed<K> = Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
    rank: (key: K) => number | undefined;
    watchRanks: (listener: () => void) => () => void;
}>;
export type Drawing<K> = Readonly<{
    keys: readonly K[];
    ranks: ReadonlyMap<K, number>;
}>;
/**
 * Draws part of a long list
 * @template K
 * @param {WindowingOptions<K>} options - The ranks in view, the keys at ranks, the keys to keep drawn, and a key's rank
 * @returns {Windowed<K>} The keys to draw, and their ranks
 */
declare function windowing<K>({ keep, keysAt, locate, ranks }: WindowingOptions<K>): Windowed<K>;
export { windowing };
