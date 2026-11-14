/**
 * An element slid by its `translate` from where it was drawn to where it rests, by a Web Animation, with the same
 * easing whichever module slides it (`follow`, `makeRoom`, `slideMoved`). An element has one slide at a time: starting
 * one, or stopping, ends the one under way, whoever started it.
 */
/**
 * Where an element is drawn now, part-way through any slide
 * @param {Element} element - The element
 * @returns {Readonly<{ x: number, y: number }>} Its box's left and top in the viewport, in CSS pixels
 */
declare function drawnAt(element: Element): Readonly<{
    x: number;
    y: number;
}>;
/**
 * Ends the slide of an element under way, leaving it where it rests
 * @param {Element} element - The element
 * @returns {void}
 */
declare function stopSlide(element: Element): void;
/**
 * Slides an element from where it was drawn to where it rests: where its layout and its own `translate` put it
 * @param {Element} element - The element
 * @param {Readonly<{ x: number, y: number }>} from - Where it was drawn (`drawnAt`)
 * @param {number} duration - How long, in ms, the slide takes (0: it jumps)
 * @returns {Animation | undefined} The slide; none when it jumps or wouldn't show
 */
declare function slide(element: Element, from: Readonly<{
    x: number;
    y: number;
}>, duration: number): Animation | undefined;
/**
 * Whether a slide is under way
 * @param {Readonly<Animation> | undefined} animation - The slide
 * @returns {boolean} Whether it is
 */
declare function sliding(animation: Readonly<Animation> | undefined): boolean;
export { drawnAt, slide, sliding, stopSlide };
