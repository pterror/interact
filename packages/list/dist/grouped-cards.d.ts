/**
 * A layout of groups of cards: each group a header as wide as the container, then its cards in as many columns as the
 * width holds, row after row. Ranks run through the groups, each header's rank just before its cards'.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type Rect = Readonly<{
    x: number;
    y: number;
    width?: number;
    height: number;
}>;
export type GroupedCardsOptions = Readonly<{
    width: Watched<number>;
    sizes: Watched<readonly number[]>;
    cardWidth: number;
    cardHeight: number;
    headerHeight: number;
}>;
export type GroupedCards = Readonly<{
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
    rowStep: (rank: number | undefined, rows: number) => number | undefined;
}>;
export type Plan = Readonly<{
    columns: number;
    starts: readonly number[];
    tops: readonly number[];
    rows: readonly number[];
    sizes: readonly number[];
    height: number;
}>;
/**
 * Groups of cards under full-width headers
 * @param {GroupedCardsOptions} options - The width they fill, each group's card count, and the sizes in pixels
 * @returns {GroupedCards} The layout, its column count, and the card a number of rows up or down from another
 */
declare function groupedCards({ cardHeight, cardWidth, headerHeight, sizes, width }: GroupedCardsOptions): GroupedCards;
export { groupedCards };
