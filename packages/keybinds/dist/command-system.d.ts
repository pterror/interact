/**
 * A CommandHub as a command system (`hub.commandSystem()`), for a bridge that keeps menus, a palette and buttons in
 * step with it, such as `@interact/components`' CommandBridge: it has the shape such a bridge asks for, and imports
 * nothing of it.
 * @import { CommandDefinition } from './hub-commands.js'
 */
import type { CommandDefinition } from './hub-commands.js';
export type SystemCommand = Readonly<{
    id: string;
    label: string;
    enabled: boolean;
    shortcut?: string;
    category?: string;
    description?: string;
}>;
export type CommandSystem = Readonly<{
    list: (tag: string | undefined) => readonly SystemCommand[];
    run: (id: string) => boolean;
    subscribe: (listener: () => void) => () => void;
}>;
export type HubOperations<D extends CommandDefinition> = Readonly<{
    all: () => readonly D[];
    applies: (id: string) => boolean;
    keys: (id: string) => readonly string[];
    listen: (listener: () => void) => () => void;
    run: (id: string) => boolean;
}>;
/**
 * A hub as a command system. Hidden commands are never listed; each command is enabled while it applies; it says its
 * list may have changed whenever the hub's context is synced, which refreshing does too, so a bridge following it is
 * live.
 * @template {CommandDefinition} D
 * @param {HubOperations<D>} hub - What the hub gives
 * @returns {CommandSystem} The command system
 */
declare function systemOf<D extends CommandDefinition>(hub: HubOperations<D>): CommandSystem;
/**
 * Calls `listener` on each event of a type, until stopped.
 * @param {EventTarget} target - What the events happen on
 * @param {string} type - Which events
 * @param {() => void} listener - What to call
 * @returns {() => void} Stops calling it
 */
declare function listenFor(target: EventTarget, type: string, listener: () => void): () => void;
export { listenFor, systemOf };
