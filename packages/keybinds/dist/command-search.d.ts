/**
 * Searching a hub's commands for a command system: by keybinds' own matcher and scorer, and, if the app gives one,
 * with further commands from a source asked once typing pauses. A command found only in the source's answer runs from
 * that answer.
 * @import { Command, Context } from './command.js'
 * @import { CommandSystemOptions, FoundSystemCommand, SystemCommand } from './command-system.js'
 * @import { ScoredCommand } from './search.js'
 */
import type { Command, Context } from './command.js';
import type { CommandSystemOptions, FoundSystemCommand, SystemCommand } from './command-system.js';
export type CommandSource = (query: string) => readonly Command[] | Promise<readonly Command[]>;
export type SearchParts = Readonly<{
    commands: () => readonly Command[];
    context: () => Context;
    inMenu: (command: Command, tag: string | undefined) => boolean;
    list: (tag: string | undefined) => readonly SystemCommand[];
    listed: (found: Readonly<{
        command: Command;
        enabled: boolean;
    }>) => SystemCommand;
    options: CommandSystemOptions;
}>;
/** A hub's commands searched, with what a source last answered */
declare class CommandSearch {
    #private;
    /** @param {SearchParts} parts - What it searches, and how */
    constructor(parts: SearchParts);
    /**
     * The commands found for what was typed, in a menu or among all: every one listed for nothing typed; otherwise the
     * hub's matches, best first, and with a source, its matches too, once typing pauses.
     * @param {string} query - What was typed
     * @param {string | undefined} tag - The menu's tag, if any
     * @returns {readonly FoundSystemCommand[] | Promise<readonly FoundSystemCommand[]>} What was found
     */
    search(query: string, tag: string | undefined): readonly FoundSystemCommand[] | Promise<readonly FoundSystemCommand[]>;
    /**
     * Runs a command found only in the source's last answer, if it applies now
     * @param {string} id - The command
     * @returns {boolean} Whether it ran
     */
    runFound(id: string): boolean;
}
export { CommandSearch };
