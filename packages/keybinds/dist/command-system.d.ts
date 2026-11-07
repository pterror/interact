/**
 * A CommandHub as a command system (`hub.commandSystem()`), for a bridge that keeps menus, a palette and buttons in
 * step with it, such as `@interact/components`' CommandBridge: it has the shape such a bridge asks for, and imports
 * nothing of it. It lists, searches and ranks its own commands, so how they rank stays keybinds', by its own matcher
 * and scorer, and, if the app gives one, with further commands from a source asked once typing pauses. A command found
 * only in the source's answer runs from that answer.
 * @import { Command, Context } from './command.js'
 * @import { Matcher, Scorer } from './search.js'
 */
import type { Command, Context } from './command.js';
import type { Matcher, Scorer } from './search.js';
export type CommandSource = (query: string) => readonly Command[] | Promise<readonly Command[]>;
export type SystemCommand = Readonly<{
    id: string;
    label: string;
    enabled: boolean;
    shortcut?: string;
    category?: string;
    description?: string;
}>;
export type FoundSystemCommand = SystemCommand & Readonly<{
    positions?: readonly number[];
}>;
export type CommandSystem = Readonly<{
    list: (tag: string | undefined) => readonly SystemCommand[];
    search: (query: string, tag: string | undefined) => readonly FoundSystemCommand[] | Promise<readonly FoundSystemCommand[]>;
    run: (id: string) => boolean;
    subscribe: (listener: () => void) => () => void;
}>;
export type CommandSystemOptions = Readonly<{
    matcher?: Matcher;
    scorer?: Scorer;
    source?: CommandSource;
    sourceDelay?: number;
}>;
export type HubOperations = Readonly<{
    commands: () => readonly Command[];
    context: () => Context;
    shortcut: (id: string) => string | undefined;
    listen: (listener: () => void) => () => void;
    run: (id: string) => boolean;
}>;
export type Scored = Readonly<{
    command: Command;
    enabled: boolean;
    score: number;
}>;
/**
 * A hub as a command system. Hidden commands are never listed or found; each command is enabled while it applies; it
 * says its list may have changed whenever the hub's context is synced, which refreshing does too, so a bridge
 * following it is live.
 * @param {HubOperations} hub - What the hub gives
 * @param {CommandSystemOptions} [options] - How it searches and ranks
 * @returns {CommandSystem} The command system
 */
declare function systemOf(hub: HubOperations, options?: CommandSystemOptions): CommandSystem;
/**
 * Calls `listener` on each event of a type, until stopped.
 * @param {EventTarget} target - What the events happen on
 * @param {string} type - Which events
 * @param {() => void} listener - What to call
 * @returns {() => void} Stops calling it
 */
declare function listenFor(target: EventTarget, type: string, listener: () => void): () => void;
export { listenFor, systemOf };
