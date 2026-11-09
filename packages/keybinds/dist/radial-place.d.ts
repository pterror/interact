/**
 * Where a radial menu's slots go, as a Place: up to eight, evenly around a circle, rank 0 at the top and on clockwise,
 * so each direction keeps its slot. Each slot is a square centred on its point of the circle, in the coordinates of
 * the square box that just holds every slot (`extent` wide), with the circle at its centre.
 */
export type RadialPlaceOptions = Readonly<{
    radius?: number;
    size?: number;
}>;
/**
 * The slots' places
 * @param {RadialPlaceOptions} [options] - The circle's radius, to each slot's centre, in px (default 100); and each
 *   slot's width and height, in px (default 64)
 * @returns {Readonly<{ place: (rank: number) => Readonly<{ x: number, y: number, width: number, height: number }>,
 *   watch: (listener: () => void) => () => void, extent: number }>} The Place (it never changes), and the width and
 *   height of the box that holds the slots
 */
declare function radialPlace({ radius, size }?: RadialPlaceOptions): Readonly<{
    place: (rank: number) => Readonly<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    watch: (listener: () => void) => () => void;
    extent: number;
}>;
export { radialPlace };
