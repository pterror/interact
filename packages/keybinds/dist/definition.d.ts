/**
 * A hub's default `adapt`: a definition that is a command, checked to be one.
 */
import type { Command } from './command.js';
import type { CommandDefinition } from './hub-commands.js';
/**
 * A definition as a command, when it is one: it has a function to run, and each field a command has beyond a
 * definition's is absent or of the command's type. The default `adapt`
 * @param {CommandDefinition} definition - The definition
 * @returns {Command} The command, running the definition's `execute`
 * @throws {TypeError} If it has no `execute` function, so the hub needs an `adapt` for it, or a field of the wrong type
 */
declare function commandOf(definition: CommandDefinition): Command;
export { commandOf };
