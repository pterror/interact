/**
 * A layout of cards of one size, in as many columns as the width holds (at least one), row after row.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type CardsOptions = Readonly<{
    width: Watched<number>;
    cardWidth: number;
    cardHeight: number;
}>;
export type Rect = Readonly<{
    x: number;
    y: number;
    width?: number;
    height: number;
}>;
export type Cards = Readonly<{
    ranksIn: (start: number, end: number, count: number) => Readonly<{
        from: number;
        to: number;
    }>;
    place: (rank: number) => Rect;
    extent: (count: number) => Readonly<{
        height: number;
    }>;
    watch: (listener: () => void) => () => void;
    columns: Watched<number>;
}>;
/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @typedef {Readonly<{ width: Watched<number>, cardWidth: number, cardHeight: number }>} CardsOptions
 */
/**
 * @typedef {Readonly<{ x: number, y: number, width?: number, height: number }>} Rect
 */
/**
 * @typedef {Readonly<{
 *   ranksIn: (start: number, end: number, count: number) => Readonly<{ from: number, to: number }>,
 *   place: (rank: number) => Rect,
 *   extent: (count: number) => Readonly<{ height: number }>,
 *   watch: (listener: () => void) => () => void,
 *   columns: Watched<number>,
 * }>} Cards
 */
/**
 * Cards in columns
 * @param {CardsOptions} options - The width they fill, and each card's size in pixels
 * @returns {Cards} The layout, and its column count
 */
declare function cards({ cardHeight, cardWidth, width }: CardsOptions): Cards;
export { cards };
