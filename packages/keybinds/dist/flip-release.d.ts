/**
 * A binding's other form, between a press and its release, as it was written otherwise: "Ctrl+K" and "Ctrl+K:up".
 */
/**
 * The other form
 * @param {string} binding - The binding
 * @returns {string} Its release, if it is a press; its press, if it is a release
 */
declare function flipRelease(binding: string): string;
export { flipRelease };
