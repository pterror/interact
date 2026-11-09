/**
 * Gamepad buttons as presses: each frame's reading of the pads against the last, a button going down a press known by
 * its pad and index ("0:7"), looked up by its standard name ("rt"), and its coming up ending it. Buttons already down
 * when a pad is first seen are where it starts, not presses; a pad that goes away lets go of what it held.
 */
export type Pad = Readonly<{
    index: number;
    buttons: readonly Readonly<{
        pressed: boolean;
    }>[];
}>;
export type Modifiers = Readonly<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}>;
export type Query = Readonly<{
    exact: readonly string[];
    bare: readonly string[];
    mods: Modifiers;
}>;
export type Press = Readonly<{
    id: string;
    query: Query;
    event: Event;
    typing: boolean;
    repeat: boolean;
}>;
export type Release = Readonly<{
    id: string;
    event: Event;
    typing: boolean;
    blocked: boolean;
}>;
export type Sink = Readonly<{
    down: (press: Press) => unknown;
    up: (release: Release) => void;
}>;
export type PadButtonsOptions = Readonly<{
    pads: Readonly<{
        get: () => readonly Pad[];
        watch: (listener: () => void) => () => void;
    }>;
    to: Sink;
    blocked?: () => boolean;
}>;
/**
 * Listens to gamepad buttons
 * @param {PadButtonsOptions} options - The pads; where presses go; and whether handlers are kept from running now
 *   (default never)
 * @returns {() => void} Stopping
 */
declare function padButtons({ blocked, pads, to }: PadButtonsOptions): () => void;
export { padButtons };
