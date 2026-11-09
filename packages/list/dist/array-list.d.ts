/**
 * A list of keys held in memory, and the keys held from it. A held key is always one of the list's keys, or none: an
 * edit that removes it moves it inside that edit, before anything hears of the edit.
 */
export type WhenRemoved = 'next' | 'none' | 'previous';
export type HeldListener<K> = (keys: readonly K[]) => void;
export type Held<K> = Readonly<{
    get: () => K | undefined;
    set: (key: K | undefined) => void;
    has: (key: K) => boolean;
    watch: (listener: HeldListener<K>) => () => void;
}>;
export type ArrayList<K> = Readonly<{
    keys: () => readonly K[];
    set: (keys: readonly K[]) => void;
    watch: (listener: () => void) => () => void;
    hold: (initial: K | undefined, whenRemoved: WhenRemoved) => Held<K>;
}>;
/**
 * A list of keys in memory. Keys are compared with `===`, and are never undefined
 * @template K
 * @param {readonly K[]} initial - Its keys, in order, each once
 * @returns {ArrayList<K>} The list
 */
declare function arrayList<K>(initial: readonly K[]): ArrayList<K>;
export { arrayList };
