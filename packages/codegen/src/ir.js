/**
 * The generator's intermediate form of the source subset: functions of statements and expressions, each expression
 * with the TypeScript type the checker gives it. Every node keeps the source node it came from (`at`), for messages;
 * a node the generator makes keeps the one it replaces.
 */

/** @import ts from 'typescript' */

/**
 * A local name: a parameter, a `const` or `let`, or a factory's parameter or constant
 * @typedef {{ name: string, id: number, type: ts.Type, mutable: boolean }} Binding
 */

/**
 * @typedef {Readonly<{ kind: 'bind', binding: Binding }>
 *   | Readonly<{ kind: 'tuple', items: readonly (Pattern | null)[], type: ts.Type }>
 *   | Readonly<{ kind: 'object', fields: readonly Readonly<{ name: string, pattern: Pattern }>[], type: ts.Type }>} Pattern
 */

/**
 * @typedef {Readonly<{ kind: 'spread', value: Expr }> | Readonly<{ kind: 'field', name: string, value: Expr }>} Entry
 */

/** @typedef {Readonly<{ spread: boolean, value: Expr }>} Item */

/**
 * @typedef {Readonly<{ at: ts.Node, type: ts.Type }>} Typed
 */

/**
 * @typedef {Typed & Readonly<{ kind: 'literal', value: number | string | boolean | null }>
 *   | Typed & Readonly<{ kind: 'undefined' }>
 *   | Typed & Readonly<{ kind: 'local', binding: Binding }>
 *   | Typed & Readonly<{ kind: 'constant', constant: Constant }>
 *   | Typed & Readonly<{ kind: 'function', fn: Fn }>
 *   | Typed & Readonly<{ kind: 'field', object: Expr, name: string, optional: boolean }>
 *   | Typed & Readonly<{ kind: 'index', object: Expr, index: Expr }>
 *   | Typed & Readonly<{ kind: 'record', entries: readonly Entry[] }>
 *   | Typed & Readonly<{ kind: 'array', items: readonly Item[] }>
 *   | Typed & Readonly<{ kind: 'call', fn: Fn, args: readonly Expr[] }>
 *   | Typed & Readonly<{ kind: 'method', object: Expr, name: string, args: readonly Expr[] }>
 *   | Typed & Readonly<{ kind: 'builtin', name: string, args: readonly Expr[] }>
 *   | Typed & Readonly<{ kind: 'unary', op: '!' | '-' | '+', operand: Expr }>
 *   | Typed & Readonly<{ kind: 'binary', op: BinaryOp, left: Expr, right: Expr }>
 *   | Typed & Readonly<{ kind: 'logical', op: '&&' | '||' | '??', left: Expr, right: Expr }>
 *   | Typed & Readonly<{ kind: 'conditional', test: Expr, whenTrue: Expr, whenFalse: Expr }>
 *   | Typed & Readonly<{ kind: 'has', name: string, object: Expr }>
 *   | Typed & Readonly<{ kind: 'template', parts: readonly (string | Expr)[] }>
 *   | Typed & Readonly<{ kind: 'regex', pattern: string, flags: string }>
 *   | Typed & Readonly<{ kind: 'lambda', params: readonly Pattern[], body: readonly Stmt[] }>} Expr
 */

/**
 * @typedef {'+' | '-' | '*' | '/' | '%' | '<' | '<=' | '>' | '>=' | '===' | '!==' | '&' | '|' | '^' | '<<' | '>>' | '>>>'} BinaryOp
 */

/**
 * @typedef {Readonly<{ kind: 'const', pattern: Pattern, value: Expr, at: ts.Node }>
 *   | Readonly<{ kind: 'let', binding: Binding, value: Expr, at: ts.Node }>
 *   | Readonly<{ kind: 'assign', binding: Binding, value: Expr, at: ts.Node }>
 *   | Readonly<{ kind: 'if', test: Expr, whenTrue: readonly Stmt[], whenFalse: readonly Stmt[], at: ts.Node }>
 *   | Readonly<{ kind: 'switch', subject: Expr, cases: readonly Case[], fallback: readonly Stmt[] | null, at: ts.Node }>
 *   | Readonly<{ kind: 'while', test: Expr, body: readonly Stmt[], at: ts.Node }>
 *   | Readonly<{ kind: 'return', value: Expr, at: ts.Node }>
 *   | Readonly<{ kind: 'set', object: Binding, name: string, value: Expr, at: ts.Node }>
 *   | Readonly<{ kind: 'emit', out: Binding, items: readonly Item[], at: ts.Node }>
 *   | Readonly<{ kind: 'insert', out: Binding, index: Expr, items: readonly Item[], at: ts.Node }>
 *   | Readonly<{ kind: 'scan', target: Binding, out: Binding, from: Expr, to: Expr, param: Binding, test: Expr, at: ts.Node }>
 *   | Readonly<{ kind: 'splice', array: Binding, index: Expr, items: readonly Expr[], at: ts.Node }>} Stmt
 */

/*
 * The in-place forms, which only the planner makes: `set` assigns a field of a record the function owns; `emit`
 * appends effects to the step's effect buffer (`spread` items append each element of an array); `insert` puts effects
 * before ones already appended; `scan` sets `target` to whether `test` holds for any of `out[from]`, ...,
 * `out[to - 1]`, each bound to `param`. `splice` puts `items` into an array the function just made, before `index`
 * as `slice` takes it: what `[...array.slice(0, index), ...items, ...array.slice(index)]` holds, in `array`.
 */

/** @typedef {Readonly<{ tests: readonly Expr[], body: readonly Stmt[] }>} Case */

/**
 * A function. `doc` is its JSDoc description, `params` its parameters' patterns with their descriptions
 * @typedef {{
 *   id: number,
 *   name: string,
 *   module: string,
 *   params: readonly Pattern[],
 *   paramDocs: readonly string[],
 *   body: readonly Stmt[],
 *   type: ts.Signature,
 *   doc: string,
 *   at: ts.Node,
 *   out: Binding | null,
 *   state: ts.Type | null,
 * }} Fn
 */

/*
 * A planned function with `out` takes the step's effect buffer as its last parameter, appends its effects to it, and
 * returns only its state (of type `state`), or `null` where the source returned `null`. A tuple parameter of the
 * source is planned as one parameter per element.
 */

/**
 * A module-level constant
 * @typedef {{ id: number, name: string, module: string, value: Expr, at: ts.Node }} Constant
 */

/**
 * How a widget is built: a leaf (`init`, `step`), or a composite (its own `init` and `step`, its children, the props
 * it gives each child, and its handlers). A factory's parameters and constants are in scope in all of them. `view` is
 * the export of its module that is its view on its own (`selectView`), which generated code draws by without the
 * source widget, or `null`
 * @typedef {Readonly<{
 *   name: string,
 *   module: string,
 *   init: Fn,
 *   step: Fn,
 *   composite: Composite | null,
 *   factory: Factory | null,
 *   view: string | null,
 * }>} Widget
 */

/**
 * @typedef {Readonly<{
 *   children: readonly Readonly<{ name: string, widget: ChildWidget }>[],
 *   props: readonly Readonly<{ child: string, fn: Fn }>[],
 *   handlers: readonly Readonly<{ phase: 'on' | 'capture' | 'bubble', child: string, type: string, fn: Fn }>[],
 * }>} Composite
 */

/**
 * A composite's child: a widget a module exports, or a factory's parameter
 * @typedef {Readonly<{ kind: 'export', module: string, name: string }> | Readonly<{ kind: 'param', binding: Binding }>} ChildWidget
 */

/**
 * @typedef {Readonly<{ name: string, params: readonly Binding[], paramDocs: readonly string[], locals: readonly Stmt[], doc: string, at: ts.Node }>} Factory
 */

/**
 * A local read
 * @param {Binding} binding - The local
 * @param {ts.Node} at - Where
 * @returns {Expr} The read
 */
function local(binding, at) {
  return { at, binding, kind: 'local', type: binding.type }
}

export { local }
