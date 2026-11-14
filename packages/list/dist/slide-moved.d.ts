export type Drawn = Readonly<{
    watch: (listener: () => void) => () => void;
}>;
export type SlideMovedOptions = Readonly<{
    drawn: Drawn;
    duration: number;
}>;
export type SlideMoved<K> = Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
    drop: (key: K, element: Element) => void;
}>;
/**
 * Slides items moved by a change to the drawn keys
 * @template K
 * @param {SlideMovedOptions} options - Hearing the drawn keys change (the change is looked at once every listener has
 *   heard, so render has drawn it); and how long, in ms, a slide takes (0: items jump, which an app passes for reduced
 *   motion)
 * @returns {SlideMoved<K>} The facet; it reports no keys, and hears the drawn keys while it is watched
 */
declare function slideMoved<K>({ drawn, duration }: SlideMovedOptions): SlideMoved<K>;
export { slideMoved };
