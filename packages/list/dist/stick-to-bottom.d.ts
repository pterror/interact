/**
 * A view kept at the bottom of a list counted from the bottom (a chat) while it is there: once the view is scrolled to
 * the list's bottom, a change to the layout, the ranks or the view (a new message at rank 0, a message measured, the
 * list growing under the view) scrolls it back there, after whatever else moved the view for that change
 * (`keepInPlace`, which holds what was on screen). Whether the view is at the bottom is decided when the scroller
 * scrolls, so a person scrolling up leaves it where they put it until they scroll back down.
 */
export type Visible = Readonly<{
    start: number;
    end: number;
}>;
export type StickToBottomOptions = Readonly<{
    element: Element;
    visible: Readonly<{
        get: () => Visible;
        watch: (listener: () => void) => () => void;
    }>;
    scrollBy: (pixels: number) => void;
    layout: Readonly<{
        watch: (listener: () => void) => () => void;
    }>;
    drawn: Readonly<{
        watchRanks: (listener: () => void) => () => void;
    }>;
}>;
/**
 * Keeps the view at the list's bottom while it is there
 * @param {StickToBottomOptions} options - The scroller; the view counted up from the list's bottom (`viewFrom` with
 *   `edge: 'bottom'`) and scrolling it, a positive amount up; hearing the layout change; and hearing the ranks change
 * @returns {() => void} Stops
 */
declare function stickToBottom({ drawn, element, layout, scrollBy, visible }: StickToBottomOptions): () => void;
export { stickToBottom };
