/**
 * Which slot a key makes active in the radial menu. Arrows point: up is the top slot, right the right one, and so on,
 * or the nearest filled slot to that when it's empty. Tab and Shift+Tab go round the filled slots.
 */
/**
 * The slot a key makes active
 * @param {Readonly<{ key: string, shiftKey: boolean }>} event - The key going down
 * @param {Readonly<{ active: number, filled: number }>} slots - The active slot (-1 for none), and how many are filled
 * @returns {number | undefined} The slot; -1 if the key moves but nothing is filled, undefined if it doesn't move
 */
declare function slotForKey({ key, shiftKey }: Readonly<{
    key: string;
    shiftKey: boolean;
}>, { active, filled }: Readonly<{
    active: number;
    filled: number;
}>): number | undefined;
export { slotForKey };
