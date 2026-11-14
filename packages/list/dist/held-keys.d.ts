/**
 * Keys held from a list that isn't held in memory (read in pages, or from a server), moved by the removals its source
 * reports. A held key is always one of the list's keys, or none: `remove` moves it inside the edit, and the app calls
 * it before the list's other listeners hear of the edit. As `arrayList` holds only keys it has, a key removed can't be
 * held until the source reports it back (`add`: a removal undone, an item put back under its key); every other key is
 * taken to be in the list, since nothing else here knows it.
 */
export type WhenRemoved = 'next' | 'none' | 'previous';
export type Removal<K> = Readonly<{
    key: K;
    next: K | undefined;
    previous: K | undefined;
}>;
export type HeldListener<K> = (keys: readonly K[]) => void;
export type Held<K> = Readonly<{
    get: () => K | undefined;
    set: (key: K | undefined) => void;
    has: (key: K) => boolean;
    watch: (listener: HeldListener<K>) => () => void;
}>;
export type HeldKeys<K> = Readonly<{
    hold: (initial: K | undefined, whenRemoved: WhenRemoved) => Held<K>;
    remove: (removals: readonly Removal<K>[]) => void;
    add: (keys: readonly K[]) => void;
}>;
/**
 * Keys held from a list whose removals are reported. Keys are compared with `===`, and are never undefined
 * @template K
 * @returns {HeldKeys<K>} Holding a key; taking in an edit's removals; and taking in keys the list has again, which
 *   it forgets having removed
 */
declare function heldKeys<K>(): HeldKeys<K>;
export { heldKeys };
