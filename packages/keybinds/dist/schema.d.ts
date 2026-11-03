/**
 * Binding schemas: their ids, and one id's bindings with a person's override laid over them.
 */
import type { BindingOverrides, BindingSchema } from './command.js';
export type BindingOverride = BindingOverrides[string];
export type Rebindable = Readonly<{
    axes?: readonly string[] | undefined;
    gamepad?: readonly string[] | undefined;
    keys?: readonly string[] | undefined;
    mouse?: readonly string[] | undefined;
}>;
export type SchemaOf<T> = Readonly<Record<keyof T, BindingSchema>>;
export type Id<T extends SchemaOf<T>> = Extract<keyof T, string>;
export type Bound<B extends BindingSchema> = Readonly<Omit<B, keyof Rebindable>> & Rebindable;
export type BoundEntry<T extends SchemaOf<T>> = Readonly<{
    binding: Bound<T[Id<T>]>;
    id: Id<T>;
}>;
/**
 * @import { BindingOverrides, BindingSchema } from './command.js'
 */
/**
 * The fields of a person's rebinding of one command or axis
 * @typedef {BindingOverrides[string]} BindingOverride
 */
/**
 * The fields a person can rebind. Their types are the general binding lists, whatever a schema's own are: an override
 * can hold any binding
 * @typedef {Readonly<{ axes?: readonly string[] | undefined, gamepad?: readonly string[] | undefined,
 *   keys?: readonly string[] | undefined, mouse?: readonly string[] | undefined }>} Rebindable
 */
/**
 * A schema whose entries are its own keys' bindings, with no index signature: reading one of its ids gives that entry
 * @template T
 * @typedef {Readonly<Record<keyof T, BindingSchema>>} SchemaOf
 */
/**
 * The ids of a schema
 * @template {SchemaOf<T>} T
 * @typedef {Extract<keyof T, string>} Id
 */
/**
 * One command's or axis's bindings in effect: its schema entry, with the fields an override can set typed as any
 * bindings
 * @template {BindingSchema} B
 * @typedef {Readonly<Omit<B, keyof Rebindable>> & Rebindable} Bound
 */
/**
 * One id of a schema, with its bindings in effect
 * @template {SchemaOf<T>} T
 * @typedef {Readonly<{ binding: Bound<T[Id<T>]>, id: Id<T> }>} BoundEntry
 */
/**
 * A binding schema as given, for type inference and autocomplete
 * @template {SchemaOf<T>} T
 * @param {T} schema - The schema
 * @returns {T} The same schema
 */
declare function defineSchema<T extends SchemaOf<T>>(schema: T): T;
/**
 * Whether a string is one of a schema's ids: one of its own keys
 * @template {SchemaOf<T>} T
 * @param {T} schema - The schema
 * @param {string} id - The string
 * @returns {id is Id<T>} Whether the schema has it
 */
declare function isId<T extends SchemaOf<T>>(schema: T, id: string): id is Id<T>;
/**
 * A schema's ids, in its order
 * @template {SchemaOf<T>} T
 * @param {T} schema - The schema
 * @returns {Id<T>[]} Its own keys
 */
declare function idsOf<T extends SchemaOf<T>>(schema: T): Id<T>[];
/**
 * One command's or axis's bindings with a person's override laid over them: each field the override sets
 * @template {BindingSchema} B
 * @param {B} binding - The defaults
 * @param {BindingOverride | undefined} override - The person's changes
 * @returns {Bound<B>} The bindings in effect
 */
declare function withOverride<B extends BindingSchema>(binding: B, override: BindingOverride | undefined): Bound<B>;
export { defineSchema, idsOf, isId, withOverride };
