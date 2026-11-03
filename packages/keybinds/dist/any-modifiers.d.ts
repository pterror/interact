/**
 * Commands with `anyModifiers: true`: their bindings match whatever other modifiers are held, as a game's movement
 * keys should. A binding's own modifiers are still required, and a command bound exactly to what was pressed comes
 * first.
 */
import type { ParsedBinding } from './binding.js';
import type { Modifiers } from './binding-mods.js';
import type { Command } from './command.js';
export type LooseTable = Readonly<{
    add: (parsed: ParsedBinding, command: Command) => void;
    find: (loose: readonly string[], mods: Modifiers, found: readonly Command[] | undefined) => readonly Command[] | undefined;
    size: () => number;
}>;
export type AnyModifiers = Readonly<{
    table: () => LooseTable;
}>;
export type Loose = Readonly<{
    command: Command;
    mods: Modifiers;
}>;
/**
 * For keybinds({ anyModifiers: anyModifiers() })
 * @returns {AnyModifiers} What keybinds() finds `anyModifiers` commands with
 */
declare function anyModifiers(): AnyModifiers;
export { anyModifiers };
