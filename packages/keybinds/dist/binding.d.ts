/**
 * Bindings as strings: "$mod+k", "k:up", "g i". A binding is split into steps and a suffix (":up", ":hold", ":tap"),
 * and each step goes to its input to parse. Syntax whose module isn't on is an error naming it.
 */
import type { Modifiers } from './binding-mods.js';
import type { Schema } from './command.js';
import type { Input } from './input.js';
export type ParsedBinding = Readonly<{
    lookup: string;
    loose: string;
    mods: Modifiers;
}>;
export type BindingSyntax = Readonly<{
    holds?: Readonly<{
        suffixes: readonly string[];
    }> | undefined;
    releases?: Readonly<{
        suffixes: readonly string[];
    }> | undefined;
    sequences?: Readonly<{
        steps: (binding: string, suffix: string) => readonly string[];
    }> | undefined;
}>;
/**
 * @import { Modifiers } from './binding-mods.js'
 * @import { Schema } from './command.js'
 * @import { Input } from './input.js'
 */
/**
 * A binding, normalized. `lookup` is equal for bindings that trigger the same way; `loose` is the lookup without
 * modifiers, which `anyModifiers` commands are found by, and `mods` the modifiers the binding still requires then
 * @typedef {Readonly<{ lookup: string, loose: string, mods: Modifiers }>} ParsedBinding
 */
/**
 * The syntax modules a binding may use, as parsing needs them: each phase's suffixes, and how sequences split steps.
 * keybinds()' options are one
 * @typedef {Readonly<{
 *   holds?: Readonly<{ suffixes: readonly string[] }> | undefined,
 *   releases?: Readonly<{ suffixes: readonly string[] }> | undefined,
 *   sequences?: Readonly<{ steps: (binding: string, suffix: string) => readonly string[] }> | undefined,
 * }>} BindingSyntax
 */
declare const RELEASE_SUFFIX = ":up";
/**
 * A lowercase binding's press or release flag, and the rest
 * @param {string} lower - The binding, lowercase
 * @returns {Readonly<{ body: string, release: boolean }>} The binding without ":up", and whether it had it
 */
declare function splitRelease(lower: string): Readonly<{
    body: string;
    release: boolean;
}>;
/**
 * A binding's press form if it's a release, its release form otherwise
 * @param {string} binding - The binding
 * @returns {string} The other form, as the binding was written
 */
declare function flipRelease(binding: string): string;
/**
 * A binding's steps and suffix, whatever syntax modules are on: for showing and comparing bindings
 * @param {string} binding - The binding
 * @returns {Readonly<{ steps: string[], suffix: string }>} Its steps in order, and ":up", ":hold", ":tap" or ""
 */
declare function splitBinding(binding: string): Readonly<{
    steps: string[];
    suffix: string;
}>;
/**
 * A binding through an input: a suffix (":up") is taken off for the phase that owns it, sequences() splits steps
 * ("g i"), and each step goes to the input to parse
 * @param {Input} input - Whose binding it is
 * @param {string} binding - The binding
 * @param {BindingSyntax} syntax - Which syntax modules are on
 * @returns {ParsedBinding & Readonly<{ steps: readonly string[] }>} The binding normalized, with each step's lookup
 * @throws {Error} If the binding is invalid, or uses syntax that isn't on
 */
declare function parseBinding(input: Input, binding: string, syntax: BindingSyntax): ParsedBinding & Readonly<{
    steps: readonly string[];
}>;
/**
 * A binding's normalized form through an input, whatever syntax it uses, for telling whether two bindings are the
 * same
 * @param {Input} input - Whose binding it is
 * @param {string} binding - The binding
 * @returns {string} Its lookup
 * @throws {Error} If the binding is invalid
 */
declare function bindingLookup(input: Input, binding: string): string;
export type Candidate = Readonly<{
    binding: string;
    except?: string | undefined;
    input: Input;
}>;
/**
 * A binding someone might give a command, to check for conflicts
 * @typedef {Readonly<{ binding: string, except?: string | undefined, input: Input }>} Candidate
 * `except` is a command not to check, usually the one being rebound
 */
/**
 * The first command or axis in a schema that a binding would conflict with
 * @param {Readonly<Schema>} schema - The bindings to check against
 * @param {Candidate} candidate - The binding, whose it is, and which command to leave out
 * @returns {Readonly<{ commandId: string, label: string }> | undefined} What it conflicts with, if anything
 */
declare function findConflict(schema: Readonly<Schema>, { binding, except, input }: Candidate): Readonly<{
    commandId: string;
    label: string;
}> | undefined;
export { RELEASE_SUFFIX, bindingLookup, findConflict, flipRelease, parseBinding, splitBinding, splitRelease };
