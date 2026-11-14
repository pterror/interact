/**
 * Items slid to their new place when the drawn keys change: an item that a reorder, an insertion or a removal moves
 * is drawn where it was and slides to where it is laid out now, instead of jumping there. A change during a slide
 * slides on from where the item is drawn. It animates `translate` with Web Animations and sets no style.
 *
 * Places are where items are laid out in their parent (their rect less their `translate`, from the parent's content
 * box's start, scrolled or not), kept from the last change, and again whenever the parent or an item is resized, so a
 * resize alone slides nothing. The items `leave` names (those a drag's facets draw) are left to what draws them.
 */
export type Drawn = Readonly<{
    watch: (listener: () => void) => () => void;
}>;
export type Leave<K> = Readonly<{
    has: (key: K) => boolean;
}>;
export type SlideMovedOptions<K> = Readonly<{
    drawn: Drawn;
    duration: number;
    leave?: Leave<K>;
}>;
export type SlideMoved<K> = Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
    drop: (key: K, element: Element) => void;
    stop: () => void;
}>;
/**
 * Slides items moved by a change to the drawn keys
 * @template K
 * @param {SlideMovedOptions<K>} options - Hearing the drawn keys change (the change is looked at once every listener
 *   has heard, so render has drawn it); how long, in ms, a slide takes (0: items jump, which an app passes for reduced
 *   motion); and the keys to leave alone when a change comes (left out: none)
 * @returns {SlideMoved<K>} The facet, which reports no keys; and stopping, after which no change slides anything
 */
declare function slideMoved<K>({ drawn, duration, leave }: SlideMovedOptions<K>): SlideMoved<K>;
export { slideMoved };
