/**
 * Prints a planned widget as a JavaScript module, and the declarations that type it as its source's widget is typed.
 * The module's widget keeps the contract (`init(props)` and `step(state, input)` give `[state, effects]`) with the
 * ownership the runtime gives it: `step` may change the state it is handed, and each result's effects array is new
 * (V8 allocates a small array faster than it empties a kept one).
 */

import { effectsOf, factoryKnown } from './effects.js'
import { capital } from './normalize.js'
import { blocksOf, eachInStmt } from './walk.js'

/** @import { Binding, Constant, Expr, Fn, Item, Pattern, Stmt } from './ir.js' */
/** @import { Call, Effects } from './effects.js' */
/** @import { Plan } from './plan.js' */

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u

/** Names the module's own code uses, which no function or constant of the widget's may take */
const TEMPLATE_NAMES = [
  'EFFECTS',
  'HERE',
  'counted',
  'current',
  'deferHost',
  'deferred',
  'deliver',
  'deliverIn',
  'includesIn',
  'ownHost',
  'prevented',
  'reference',
  'same',
  'sliceIndex',
  'start',
  'stopped',
  'syncProps',
  'toChild',
  'upward',
  'view',
]

/** Functions a module defines when it uses them: JavaScript's operations without the arrays they would make */
const HELPERS = {
  includesIn: [
    '/**',
    ' * Whether `list.slice(from, to)` includes `value`, without making the slice',
    ' * @param list - The array',
    ' * @param value - What is looked for, by SameValueZero as `includes` looks',
    ' * @param from - Where the slice starts',
    ' * @param to - Where it ends',
    ' */',
    'function includesIn(list, value, from, to = list.length) {',
    '  const start = sliceIndex(from, list.length)',
    '  const end = sliceIndex(to, list.length)',
    '  for (let index = start; index < end; index += 1) {',
    '    const item = list[index]',
    '    if (item === value || (item !== item && value !== value)) {',
    '      return true',
    '    }',
    '  }',
    '  return false',
    '}',
    '',
    '/**',
    ' * An index as `slice` takes it: truncated, from the end if negative, within the array',
    ' * @param index - The index',
    ' * @param count - The length',
    ' */',
    'function sliceIndex(index, count) {',
    '  const whole = Math.trunc(index) || 0',
    '  return whole < 0 ? Math.max(count + whole, 0) : Math.min(whole, count)',
    '}',
  ],
}
const RESERVED = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

/**
 * Where the generated module finds what it imports: the source's modules, for the views; a child widget is the module
 * generated beside it
 * @typedef {Readonly<{
 *   source: (module: string) => string,
 *   header: string,
 * }>} Imports
 */

/**
 * Prints a planned widget
 * @param {Plan} planned - The plan
 * @param {Imports} imports - Where its imports come from, and its header
 * @param {ReadonlyMap<string, Effects>} others - The effects of the other widgets generated, by name, for a child's
 * @returns {Readonly<{ js: string, dts: string }>} The module and its declarations
 */
function printJs(planned, imports, others) {
  const { widget } = planned
  const nameOf = moduleNames(planned)
  const factoryAt = widget.factory?.at ?? null
  const known = factoryKnown(planned)
  const effects = effectsOf(planned, known)
  /** @type {Map<Binding, string>} */
  const factoryNames = new Map((widget.factory?.params ?? []).map((binding) => [binding, binding.name]))
  for (const binding of known.keys()) {
    factoryNames.set(binding, binding.name)
  }
  const printer = makePrinter(nameOf, factoryNames, effects)
  const { composite, factory } = widget
  const childImports = (composite?.children ?? []).flatMap((child) =>
    child.widget.kind === 'export' ? [`import { ${child.widget.name} } from './${child.widget.name}.js'`] : [],
  )
  const top = [
    imports.header,
    ...(composite === null ? [] : [`import { same } from '${imports.source('packages/core/src/compose.js')}'`]),
    `import { ${widget.name} as reference } from '${imports.source(widget.module)}'`,
    ...childImports,
    '',
    '/** Where an effect the widget makes comes from: the widget itself */',
    'const HERE = []',
    '',
    `const EFFECTS = ${effectsText(effects, composite !== null)}`,
    '',
    ...(effects.counted.size > 0
      ? ['/** How many of the effects a test reads the widget has made */', 'let counted = 0', '']
      : []),
  ]
  /** @type {string[]} */
  const body = []
  for (const constant of planned.constants.filter((one) => !isInside(one.at, factoryAt))) {
    body.push(`const ${nameOf(constant)} = ${printer.expr(constant.value)}`, '')
  }
  const outside = planned.fns.filter((one) => !isInside(one.at, factoryAt))
  for (const fn of outside) {
    body.push(...printer.fn(fn, ''), '')
  }
  const view = factory === null ? 'reference.view' : 'view'
  const made = composite === null ? leafParts(planned, nameOf) : compositeParts(planned, nameOf, others)
  const object = `{\n${made.fields.map((field) => `  ${field},`).join('\n')}\n  view: ${view},\n}`
  if (factory === null) {
    body.push(...made.lines, '', `export const ${widget.name} = ${object}`)
  } else {
    const params = factory.params.map((param) => param.name).join(', ')
    const inner = planned.fns.filter((one) => isInside(one.at, factoryAt))
    body.push(
      ...docLines(
        factory.doc,
        factory.params.map((param, at) => [param.name, factory.paramDocs[at] ?? '']),
        '',
      ),
      `export function ${widget.name}(${params}) {`,
      ...factory.locals.flatMap((stmt) => printer.stmt(stmt, '  ')),
      ...planned.constants
        .filter((one) => isInside(one.at, factoryAt))
        .map((constant) => `  const ${nameOf(constant)} = ${printer.expr(constant.value)}`),
      ...inner.flatMap((fn) => printer.fn(fn, '  ')),
      `  const { view } = reference(${params})`,
      ...made.lines.map((line) => (line === '' ? '' : `  ${line}`)),
      `  return ${object.replaceAll('\n', '\n  ')}`,
      '}',
    )
  }
  return {
    dts: declarations(planned, effects, imports),
    js: `${[...top, ...printer.helpers(), ...body].join('\n')}\n`,
  }
}

/**
 * The host methods a widget's module gives, as data: each method's effect type and fields, for a host that turns calls
 * back into effects. A composite's own `send` and `stopPropagation` stay inside it
 * @param {Effects} effects - The widget's effects
 * @param {boolean} isComposite - Whether it is a composite
 * @returns {string} The object's source
 */
function effectsText(effects, isComposite) {
  const methods = effects.methods.filter(
    (one) => !isComposite || (one.type !== 'send' && one.type !== 'stopPropagation'),
  )
  const entries = methods.map(
    (one) =>
      `  ${one.method}: { fields: [${one.fields.map((field) => quote(field)).join(', ')}], type: ${quote(one.type)} },`,
  )
  return entries.length === 0 ? '{}' : `{\n${entries.join('\n')}\n}`
}

/**
 * A leaf's object fields: `deliver` (for a composite holding it, or the runtime), `effects`, `init` and `step`
 * @param {Plan} planned - The plan
 * @param {(owner: Fn | Constant) => string} nameOf - Module-level names
 * @returns {Readonly<{ lines: readonly string[], fields: readonly string[] }>} Lines before the object, and its fields
 */
function leafParts(planned, nameOf) {
  const init = nameOf(planned.planned.get(planned.widget.init) ?? planned.widget.init)
  const step = nameOf(planned.planned.get(planned.widget.step) ?? planned.widget.step)
  return {
    fields: [
      `deliver: (state, path, at, input, host) => ${step}(state, input, host)`,
      'effects: EFFECTS',
      `init: ${init}`,
      `step: ${step}`,
    ],
    lines: [],
  }
}

/**
 * A composite, compiled: its own step and handlers called directly, each child given a host whose methods call the
 * composite's \`on\` handler for that effect (and go on up unless it stops them) or go straight up. While a delivery is
 * under way the composite's state and its host are the module's (saved and restored around it), so the children's
 * hosts are made once. A child's effects reach the host above with where they came from, each path made once
 * @param {Plan} planned - The plan
 * @param {(owner: Fn | Constant) => string} nameOf - Module-level names
 * @param {ReadonlyMap<string, Effects>} others - The effects of the widgets a child may be
 * @returns {Readonly<{ lines: readonly string[], fields: readonly string[] }>} Lines before the object, and its fields
 */
function compositeParts(planned, nameOf, others) {
  const { widget } = planned
  const { composite } = widget
  if (composite === null) {
    throw new Error('Not a composite')
  }
  const fnName = (/** @type {Fn} */ fn) => nameOf(planned.planned.get(fn) ?? fn)
  const ownMethods = (others.get(widget.name)?.methods ?? []).filter(
    (one) => one.type !== 'send' && one.type !== 'stopPropagation',
  )
  const planOf = (/** @type {Fn} */ fn) => planned.planned.get(fn) ?? fn
  const children = composite.children.map((child) => ({
    host: `${child.name}Host`,
    name: child.name,
    prefixes: `${child.name}Paths`,
    props: `${child.name}Synced`,
    propsFn: composite.props.find((one) => one.child === child.name)?.fn ?? null,
    ref: child.widget.kind === 'export' ? child.widget.name : child.widget.binding.name,
  }))
  /** @type {string[]} */
  const lines = [
    'let current = null',
    'let upward = null',
    'let stopped = false',
    'let prevented = false',
    ...children.map((child) => `let ${child.props} = null`),
    '',
    "/** What the composite's own functions call: a send goes to the child, the rest up, from the composite */",
    'const ownHost = {',
    '  send: (from, input, to) => {',
    '    syncProps()',
    '    toChild(to, HERE, 0, input)',
    '  },',
    '  stopPropagation: () => {',
    '    stopped = true',
    '  },',
    '}',
    ...ownMethods.flatMap((one) => [
      `ownHost.${one.method} = (${['from', ...one.fields].join(', ')}) => {`,
      ...(one.type === 'preventDefault' ? ['  prevented = true'] : []),
      `  upward.${one.method}(${['from', ...one.fields].join(', ')})`,
      '}',
    ]),
    '',
    '/** The own effects init makes, kept until the children have started, as the runtime orders them */',
    'let deferred = []',
    'const deferHost = {}',
    `for (const method of [...Object.keys(EFFECTS), 'send', 'stopPropagation']) {`,
    `  deferHost[method] = (from, ...args) => deferred.push([method, args])`,
    '}',
    '',
  ]
  for (const child of children) {
    const handled = composite.handlers.filter((one) => one.phase === 'on' && one.child === child.name)
    lines.push(
      `const ${child.prefixes} = new Map()`,
      '',
      `/** Where an effect from ${child.name} came from, from the composite: made once per path */`,
      `function ${child.name}From(from) {`,
      `  let path = ${child.prefixes}.get(from)`,
      '  if (path === undefined) {',
      `    path = [${quote(child.name)}, ...from]`,
      `    ${child.prefixes}.set(from, path)`,
      '  }',
      '  return path',
      '}',
      '',
      `const ${child.host} = {`,
    )
    for (const handler of handled) {
      const fn = planOf(handler.fn)
      const childEffects = others.get(child.ref)
      if (childEffects === undefined) {
        throw new Error(`${widget.name}: an \`on\` handler of a child the generator doesn't know the effects of`)
      }
      for (const one of childEffects.methods.filter((method) => method.type === handler.type)) {
        const fields = planned.handlerFields.get(handler.fn) ?? null
        const args = [
          'current.own',
          ...(fields ?? [`{ ${[`type: ${quote(one.type)}`, ...one.fields].join(', ')} }`]),
          ...(fn.params.length > 2 ? ['from'] : []),
          'ownHost',
        ]
        const params = ['from', ...one.fields].join(', ')
        lines.push(
          `  ${one.method}: (${params}) => {`,
          ...(one.type === 'preventDefault' ? ['    prevented = true'] : []),
          '    const was = stopped',
          '    stopped = false',
          `    current.own = ${fnName(handler.fn)}(${args.join(', ')})`,
          '    const stop = stopped',
          '    stopped = was',
          '    if (!stop) {',
          `      upward.${one.method}(${[`${child.name}From(from)`, ...one.fields].join(', ')})`,
          '    }',
          '  },',
        )
      }
    }
    const known = others.get(child.ref)
    const handledTypes = new Set(handled.map((one) => one.type))
    const forwarded =
      known === undefined
        ? [
            `for (const method of Object.keys(${child.ref}.effects)) {`,
            `  ${child.host}[method] ??= (from, ...args) => upward[method](${child.name}From(from), ...args)`,
            '}',
            `${child.host}.preventDefault = (from) => {`,
            '  prevented = true',
            `  upward.preventDefault(${child.name}From(from))`,
            '}',
          ]
        : known.methods.flatMap((one) =>
            handledTypes.has(one.type)
              ? []
              : [
                  `${child.host}.${one.method} = (${['from', ...one.fields].join(', ')}) => {`,
                  ...(one.type === 'preventDefault' ? ['  prevented = true'] : []),
                  `  upward.${one.method}(${[`${child.name}From(from)`, ...one.fields].join(', ')})`,
                  '}',
                ],
          )
    lines.push('}', ...forwarded, '')
  }
  lines.push(
    '/** Delivers an input to a child, or below it */',
    'function toChild(name, path, at, input) {',
    ...children.flatMap((child) => [
      `  if (name === ${quote(child.name)}) {`,
      `    current.children.${child.name} = ${child.ref}.deliver(current.children.${child.name}, path, at, input, ${child.host})`,
      '  }',
    ]),
    '}',
    '',
    '/** Gives each child whose props changed its new props, until none do */',
    'function syncProps() {',
    '  for (let round = 0; round < 16; round += 1) {',
    ...children.map(
      (child) => `    const ${child.name}Now = ${child.propsFn === null ? 'null' : fnName(child.propsFn)}(current.own)`,
    ),
    ...children.map((child) => `    const ${child.name}Changed = !same(${child.props}, ${child.name}Now)`),
    `    if (${children.map((child) => `!${child.name}Changed`).join(' && ')}) {`,
    '      return',
    '    }',
    ...children.map((child) => `    ${child.props} = ${child.name}Now`),
    ...children.flatMap((child) => [
      `    if (${child.name}Changed) {`,
      `      toChild(${quote(child.name)}, HERE, 0, { props: ${child.name}Now, type: 'props' })`,
      '    }',
    ]),
    '  }',
    "  throw new Error('Props between a composite and its children never settle')",
    '}',
    '',
  )
  const handlerCall = (/** @type {Readonly<{ fn: Fn }>} */ handler, /** @type {string} */ prevented) => {
    const fn = planOf(handler.fn)
    const args = ['current.own', 'input', prevented].slice(0, fn.params.length)
    return `${fnName(handler.fn)}(${[...args, 'ownHost'].join(', ')})`
  }
  lines.push(
    '/** Delivers an input inside the composite: to its own step, or through capture, the child and bubble */',
    'function deliverIn(path, at, input) {',
    '  if (at === path.length) {',
    `    current.own = ${fnName(widget.step)}(current.own, input, ownHost)`,
    '    return',
    '  }',
    '  const name = path[at]',
    ...children.flatMap((child) => {
      const captures = composite.handlers.filter((one) => one.phase === 'capture' && one.child === child.name)
      const bubbles = composite.handlers.filter((one) => one.phase === 'bubble' && one.child === child.name)
      return [
        `  if (name === ${quote(child.name)}) {`,
        ...captures.flatMap((handler) => [
          `    if (input.type === ${quote(handler.type)}) {`,
          '      const was = stopped',
          '      stopped = false',
          `      current.own = ${handlerCall(handler, 'false')}`,
          '      const stop = stopped',
          '      stopped = was',
          '      if (stop) {',
          '        return',
          '      }',
          '    }',
        ]),
        '    syncProps()',
        '    prevented = false',
        `    toChild(name, path, at + 1, input)`,
        ...bubbles.flatMap((handler) => [
          `    if (input.type === ${quote(handler.type)}) {`,
          `      current.own = ${handlerCall(handler, 'prevented')}`,
          '    }',
        ]),
        '  }',
      ]
    }),
    '}',
    '',
    "/** Delivers an input to the widget at `path` from `at`, the composite's own effects and its children's to `host` */",
    'function deliver(state, path, at, input, host) {',
    `  const was = current`,
    `  const wasHost = upward`,
    '  const wasPrevented = prevented',
    ...children.map((child) => `  const was${capital(child.props)} = ${child.props}`),
    '  current = state',
    '  upward = host',
    ...children.map(
      (child) => `  ${child.props} = ${child.propsFn === null ? 'null' : fnName(child.propsFn)}(state.own)`,
    ),
    '  deliverIn(path, at, input)',
    '  syncProps()',
    '  current = was',
    '  upward = wasHost',
    '  prevented = wasPrevented',
    ...children.map((child) => `  ${child.props} = was${capital(child.props)}`),
    '  return state',
    '}',
    '',
    '/** Starts the composite: its own state, then its children, then its own first effects, as the runtime orders them */',
    'function start(props, host) {',
    '  deferred = []',
    `  const own = ${fnName(widget.init)}(props, deferHost)`,
    '  const kept = deferred',
    '  const state = { children: {}, own }',
    '  const was = current',
    '  const wasHost = upward',
    ...children.map((child) => `  const was${capital(child.props)} = ${child.props}`),
    '  current = state',
    '  upward = host',
    ...children.flatMap((child) => [
      `  ${child.props} = ${child.propsFn === null ? 'null' : fnName(child.propsFn)}(own)`,
      `  state.children.${child.name} = ${child.ref}.init(${child.props}, ${child.host})`,
    ]),
    '  for (const [method, args] of kept) {',
    '    ownHost[method](HERE, ...args)',
    '  }',
    '  syncProps()',
    '  current = was',
    '  upward = wasHost',
    ...children.map((child) => `  ${child.props} = was${capital(child.props)}`),
    '  return state',
    '}',
    '',
  )
  return {
    fields: [
      `bubble: ${handlersText(composite.handlers, 'bubble', fnName)}`,
      `capture: ${handlersText(composite.handlers, 'capture', fnName)}`,
      `children: { ${children.map((child) => (child.ref === child.name ? child.name : `${child.name}: ${child.ref}`)).join(', ')} }`,
      'deliver',
      `effects: { ...EFFECTS, ${children.map((child) => `...${child.ref}.effects`).join(', ')} }`,
      'init: start',
      `on: ${handlersText(composite.handlers, 'on', fnName)}`,
      `props: { ${composite.props.map((one) => `${one.child}: ${fnName(one.fn)}`).join(', ')} }`,
    ],
    lines,
  }
}

/**
 * A composite's handlers of one phase by child and type, for what renderers read of them (which inputs a child's
 * parts are heard for)
 * @param {readonly Readonly<{ phase: string, child: string, type: string, fn: Fn }>[]} handlers - The handlers
 * @param {string} phase - The phase
 * @param {(fn: Fn) => string} nameOf - A handler's name
 * @returns {string} The object's source
 */
function handlersText(handlers, phase, nameOf) {
  /** @type {Map<string, string[]>} */
  const byChild = new Map()
  for (const handler of handlers.filter((one) => one.phase === phase)) {
    const list = byChild.get(handler.child) ?? []
    list.push(`${handler.type}: ${nameOf(handler.fn)}`)
    byChild.set(handler.child, list)
  }
  if (byChild.size === 0) {
    return '{}'
  }
  return `{ ${[...byChild].map(([child, list]) => `${child}: { ${list.join(', ')} }`).join(', ')} }`
}

/**
 * The declarations: the host the widget calls, typed from its source's effects, and the widget
 * @param {Plan} planned - The plan
 * @param {Effects} effects - Its effects
 * @param {Imports} imports - Where the source is
 * @returns {string} The .d.ts source
 */
function declarations(planned, effects, imports) {
  const { widget } = planned
  const hostName = `${capital(widget.name)}Host`
  const source = `import('${imports.source(widget.module)}').${widget.name}`
  const isComposite = widget.composite !== null
  const sourceType = widget.factory === null ? `typeof ${source}` : `ReturnType<typeof ${source}>`
  const methods = effects.methods
    .filter((one) => !isComposite || (one.type !== 'send' && one.type !== 'stopPropagation'))
    .map((one) => {
      const params = one.fields.map((field) => `${field}: ${capital(one.method)}[${quote(field)}]`)
      return `  ${one.method}(${['from: Path', ...params].join(', ')}): void`
    })
  const effectTypes = effects.methods
    .filter((one) => !isComposite || (one.type !== 'send' && one.type !== 'stopPropagation'))
    .map((one) => {
      const shape = `{ type: ${quote(one.type)}${one.fields.map((field) => `; ${field}: unknown`).join('')} }`
      return `type ${capital(one.method)} = Extract<Effect, ${shape}>`
    })
  const childModules = (widget.composite?.children ?? []).flatMap((child) =>
    child.widget.kind === 'export' ? [child.widget.name] : [],
  )
  const childHosts = childModules.map((name) => `${capital(name)}Host`)
  const host = [
    `/** What ${widget.name} calls for each effect it makes, with where the effect came from */`,
    `export interface ${hostName}${childHosts.length > 0 ? ` extends ${childHosts.join(', ')}` : ''} {`,
    ...methods,
    '}',
  ]
  const generated = [
    `type Generated<H> = {`,
    "  init(props: Parameters<Source['init']>[0], host: H): State",
    `  ${isComposite ? '' : "step(state: State, input: Parameters<Source['step']>[1], host: H): State\n  "}deliver(state: State, path: Path, at: number, input: unknown, host: H): State`,
    '  effects: Readonly<Record<string, Readonly<{ type: string, fields: readonly string[] }>>>',
    "  view: Source['view']",
    '}',
  ]
  const exported =
    widget.factory === null
      ? [`export declare const ${widget.name}: Generated<${hostName}>`]
      : [`export declare function ${widget.name}<H>(...args: Parameters<typeof ${source}>): Generated<${hostName} & H>`]
  return [
    imports.header,
    `import type { Path } from '${imports.source('packages/core/src/contract.js')}'`,
    ...childModules.map((name) => `import type { ${capital(name)}Host } from './${name}.js'`),
    '',
    `type Source = ${sourceType}`,
    `type State = ${isComposite ? "Readonly<{ own: ReturnType<Source['init']>[0], children: unknown }>" : "ReturnType<Source['init']>[0]"}`,
    `type Effect = ReturnType<Source['step']>[1][number]`,
    ...effectTypes,
    '',
    ...host,
    '',
    ...generated,
    '',
    ...exported,
    '',
  ].join('\n')
}

/**
 * Names for a plan's functions and constants, unique in the module: a function from another source module than the
 * widget's takes that module's name before its own
 * @param {Plan} planned - The plan
 * @returns {(owner: Fn | Constant) => string} The names
 */
function moduleNames(planned) {
  const { widget } = planned
  /** @type {Map<number, string>} */
  const names = new Map()
  const taken = new Set([
    ...TEMPLATE_NAMES,
    widget.name,
    ...(widget.factory?.params ?? []).map((one) => one.name),
    ...(widget.composite?.children ?? []).flatMap((child) =>
      ['Host', 'From', 'Paths', 'Synced', 'Now', 'Changed'].map((end) => `${child.name}${end}`),
    ),
  ])
  /**
   * @param {Fn | Constant} owner - What is named
   * @returns {string} Its name
   */
  const nameOf = (owner) => {
    const known = names.get(owner.id)
    if (known !== undefined) {
      return known
    }
    const own = owner.module === widget.module ? owner.name : `${prefixOf(owner.module)}${capital(owner.name)}`
    const base = RESERVED.has(own) ? `${own}_` : own
    let name = base
    for (let count = 2; taken.has(name); count += 1) {
      name = `${base}${String(count)}`
    }
    taken.add(name)
    names.set(owner.id, name)
    return name
  }
  for (const fn of planned.fns) {
    nameOf(fn)
  }
  for (const constant of planned.constants) {
    nameOf(constant)
  }
  return nameOf
}

/**
 * The name a module's functions take in another module's output: its file's base name
 * @param {string} module - The module's path
 * @returns {string} The prefix
 */
function prefixOf(module) {
  const base = module.split('/').at(-1) ?? module
  return base.replace(/\.js$/u, '').replaceAll(/-(?<letter>\w)/gu, (_, letter) => String(letter).toUpperCase())
}

/**
 * Whether a node is inside another
 * @param {import('typescript').Node} node - The node
 * @param {import('typescript').Node | null} outer - The other
 * @returns {boolean} Whether it is
 */
function isInside(node, outer) {
  return (
    outer !== null && node.getSourceFile() === outer.getSourceFile() && node.pos >= outer.pos && node.end <= outer.end
  )
}

/**
 * A JSDoc comment for a function
 * @param {string} doc - Its description
 * @param {readonly (readonly [string, string])[]} params - Its parameters' names and descriptions
 * @param {string} indent - The indent
 * @returns {string[]} The comment's lines
 */
function docLines(doc, params, indent) {
  const text = [
    ...doc.split('\n').filter((line) => line.trim() !== ''),
    ...params.filter(([, said]) => said !== '').map(([name, said]) => `@param ${name} - ${said.replaceAll('\n', ' ')}`),
  ]
  if (text.length === 0) {
    return []
  }
  return [`${indent}/**`, ...text.map((line) => `${indent} * ${line}`), `${indent} */`]
}

/**
 * The printer of functions, statements and expressions
 * @param {(owner: Fn | Constant) => string} nameOf - Module-level names
 * @param {ReadonlyMap<Binding, string>} outer - Names of a factory's parameters
 * @param {Effects} effects - The widget's effects, as host methods
 * @returns {Readonly<{
 *   fn: (fn: Fn, indent: string) => string[],
 *   stmt: (stmt: Stmt, indent: string) => string[],
 *   expr: (value: Expr) => string,
 *   helpers: () => string[],
 * }>} The printer
 */
function makePrinter(nameOf, outer, effects) {
  /** @type {Map<Binding, string>} */
  let locals = new Map(outer)
  /** @type {Set<string>} */
  let used = new Set(outer.values())
  /** @type {ReadonlySet<Binding>} */
  let read = new Set()
  /** @type {Set<keyof typeof HELPERS>} */
  const helpers = new Set()

  /**
   * A local's name, unique in its function
   * @param {Binding} binding - The local
   * @returns {string} Its name
   */
  const localName = (binding) => {
    const known = locals.get(binding)
    if (known !== undefined) {
      return known
    }
    const base = RESERVED.has(binding.name) ? `${binding.name}_` : binding.name
    let name = base
    for (let count = 2; used.has(name); count += 1) {
      name = `${base}${String(count)}`
    }
    used.add(name)
    locals.set(binding, name)
    return name
  }

  /**
   * A function
   * @param {Fn} one - The function, planned
   * @param {string} indent - The indent
   * @returns {string[]} Its lines
   */
  const printFn = (one, indent) => {
    locals = new Map(outer)
    used = new Set([...outer.values(), 'host'])
    read = readBindings(one.body)
    const params = one.params.map((param) => patternText(param, localName))
    if (one.out !== null) {
      locals.set(one.out, 'host')
    }
    /** @type {(readonly [string, string])[]} */
    const docParams = params.map((param, at) => [param, one.paramDocs[at] ?? ''])
    return [
      ...docLines(one.doc, docParams, indent),
      `${indent}function ${nameOf(one)}(${[...params, ...(one.out === null ? [] : ['host'])].join(', ')}) {`,
      ...block(one.body, `${indent}  `),
      `${indent}}`,
    ]
  }

  /**
   * A block's lines
   * @param {readonly Stmt[]} stmts - The block
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const block = (stmts, indent) => stmts.flatMap((one) => printStmt(one, indent))

  /**
   * A statement
   * @param {Stmt} one - The statement
   * @param {string} indent - The indent
   * @returns {string[]} Its lines
   */
  const printStmt = (one, indent) => {
    const inner = `${indent}  `
    switch (one.kind) {
      case 'const': {
        if (one.pattern.kind === 'bind' && !read.has(one.pattern.binding) && one.value.kind === 'call') {
          return [`${indent}${printExpr(one.value)}`]
        }
        return [`${indent}const ${patternText(one.pattern, localName)} = ${printExpr(one.value)}`]
      }
      case 'let': {
        const name = localName(one.binding)
        return [
          one.value.kind === 'undefined' ? `${indent}let ${name}` : `${indent}let ${name} = ${printExpr(one.value)}`,
        ]
      }
      case 'assign': {
        return [`${indent}${localName(one.binding)} = ${printExpr(one.value)}`]
      }
      case 'set': {
        return [`${indent}${localName(one.object)}${member(one.name, false)} = ${printExpr(one.value)}`]
      }
      case 'return': {
        return [`${indent}return ${printExpr(one.value)}`]
      }
      case 'if': {
        const lines = [`${indent}if (${printExpr(one.test)}) {`, ...block(one.whenTrue, inner)]
        const [only] = one.whenFalse
        if (one.whenFalse.length === 1 && only?.kind === 'if') {
          const [first, ...others] = printStmt(only, indent)
          return [...lines, `${indent}} else ${(first ?? '').trimStart()}`, ...others]
        }
        if (one.whenFalse.length > 0) {
          lines.push(`${indent}} else {`, ...block(one.whenFalse, inner))
        }
        return [...lines, `${indent}}`]
      }
      case 'switch': {
        const clauses = one.cases.flatMap((clause) => [
          ...clause.tests.map(
            (test, at) => `${inner}case ${printExpr(test)}:${at === clause.tests.length - 1 ? ' {' : ''}`,
          ),
          ...block(clause.body, `${inner}  `),
          `${inner}}`,
        ])
        const fallback =
          one.fallback === null ? [] : [`${inner}default: {`, ...block(one.fallback, `${inner}  `), `${inner}}`]
        return [`${indent}switch (${printExpr(one.subject)}) {`, ...clauses, ...fallback, `${indent}}`]
      }
      case 'while': {
        return [`${indent}while (${printExpr(one.test)}) {`, ...block(one.body, inner), `${indent}}`]
      }
      case 'emit': {
        return callLines(localName(one.out), effects.calls(one.items), indent)
      }
      case 'insert': {
        throw new Error('effects put before ones already made: no host call order gives them')
      }
      case 'scan': {
        return [`${indent}const ${localName(one.target)} = ${printExpr(one.to)} !== ${printExpr(one.from)}`]
      }
      default: {
        throw new TypeError('Not a statement')
      }
    }
  }

  /**
   * Calls on the host for effects appended, the ones a test over effects counts counted first
   * @param {string} host - The host
   * @param {readonly Call[]} calls - The calls
   * @param {string} indent - The indent
   * @returns {string[]} The lines
   */
  const callLines = (host, calls, indent) =>
    calls.flatMap((call) => {
      if (call.kind === 'call') {
        const args = ['HERE', ...call.args.map((arg) => printExpr(arg))].join(', ')
        const count = effects.counted.has(call.method.type) ? [`${indent}counted += 1`] : []
        return [...count, `${indent}${host}${member(call.method.method, false)}(${args})`]
      }
      const whenTrue = callLines(host, call.whenTrue, `${indent}  `)
      const whenFalse = callLines(host, call.whenFalse, `${indent}  `)
      if (whenTrue.length === 0) {
        return whenFalse.length === 0 ? [] : [`${indent}if (!${operand(call.test)}) {`, ...whenFalse, `${indent}}`]
      }
      const otherwise = whenFalse.length > 0 ? [`${indent}} else {`, ...whenFalse] : []
      return [`${indent}if (${printExpr(call.test)}) {`, ...whenTrue, ...otherwise, `${indent}}`]
    })

  /**
   * An array item
   * @param {Item} item - The item
   * @returns {string} Its source
   */
  const itemText = (item) => (item.spread ? `...${operand(item.value)}` : printExpr(item.value))

  /**
   * An expression, parenthesized unless it is an atom
   * @param {Expr} value - The expression
   * @returns {string} Its source
   */
  const operand = (value) => {
    const text = printExpr(value)
    return isAtom(value) ? text : `(${text})`
  }

  /**
   * A record literal: a later field of one name replaces an earlier one (the values are only read)
   * @param {Expr & { kind: 'record' }} value - The literal
   * @returns {string} Its source
   */
  const recordText = (value) => {
    /** @type {Map<string, string>} */
    const fields = new Map()
    /** @type {string[]} */
    const parts = []
    for (const entry of value.entries) {
      if (entry.kind === 'spread') {
        parts.push(`...${operand(entry.value)}`)
        continue
      }
      const text = printExpr(entry.value)
      const key = IDENTIFIER.test(entry.name) ? entry.name : quote(entry.name)
      const part = text === entry.name ? entry.name : `${key}: ${text}`
      const before = fields.get(entry.name)
      if (before !== undefined) {
        parts.splice(parts.indexOf(before), 1)
      }
      fields.set(entry.name, part)
      parts.push(part)
    }
    return parts.length === 0 ? '{}' : `{ ${parts.join(', ')} }`
  }

  /**
   * An expression
   * @param {Expr} value - The expression
   * @returns {string} Its source
   */
  const printExpr = (value) => {
    switch (value.kind) {
      case 'literal': {
        return typeof value.value === 'string' ? quote(value.value) : String(value.value)
      }
      case 'undefined': {
        return 'undefined'
      }
      case 'local': {
        return localName(value.binding)
      }
      case 'constant': {
        return nameOf(value.constant)
      }
      case 'function': {
        return nameOf(value.fn)
      }
      case 'field': {
        if (value.name === 'length' && value.object.kind === 'local' && locals.get(value.object.binding) === 'host') {
          return 'counted'
        }
        return `${operand(value.object)}${member(value.name, value.optional)}`
      }
      case 'index': {
        return `${operand(value.object)}[${printExpr(value.index)}]`
      }
      case 'record': {
        return recordText(value)
      }
      case 'array': {
        return `[${value.items.map((item) => itemText(item)).join(', ')}]`
      }
      case 'call': {
        return `${nameOf(value.fn)}(${value.args.map((arg) => printExpr(arg)).join(', ')})`
      }
      case 'builtin': {
        if (value.name === 'includesIn') {
          helpers.add('includesIn')
        }
        return `${value.name}(${value.args.map((arg) => printExpr(arg)).join(', ')})`
      }
      case 'method': {
        return `${operand(value.object)}.${value.name}(${value.args.map((arg) => printExpr(arg)).join(', ')})`
      }
      case 'unary': {
        return `${value.op}${operand(value.operand)}`
      }
      case 'binary':
      case 'logical': {
        return `${operand(value.left)} ${value.op} ${operand(value.right)}`
      }
      case 'conditional': {
        return `${operand(value.test)} ? ${operand(value.whenTrue)} : ${operand(value.whenFalse)}`
      }
      case 'has': {
        return `${quote(value.name)} in ${operand(value.object)}`
      }
      case 'template': {
        const parts = value.parts.map((part) =>
          typeof part === 'string' ? part.replaceAll(/[`$\\]/gu, (char) => `\\${char}`) : `\${${printExpr(part)}}`,
        )
        return `\`${parts.join('')}\``
      }
      case 'regex': {
        return `/${value.pattern}/${value.flags}`
      }
      case 'lambda': {
        const params = value.params.map((param) => patternText(param, localName))
        const head =
          params.length === 1 && value.params[0]?.kind === 'bind' ? (params[0] ?? '') : `(${params.join(', ')})`
        const [only] = value.body
        if (value.body.length === 1 && only?.kind === 'return') {
          const body = printExpr(only.value)
          return `${head} => ${only.value.kind === 'record' ? `(${body})` : body}`
        }
        return `${head} => {\n${block(value.body, '    ').join('\n')}\n  }`
      }
      default: {
        throw new TypeError('Not an expression')
      }
    }
  }

  return {
    expr: printExpr,
    fn: printFn,
    helpers: () => [...helpers].flatMap((name) => [...HELPERS[name], '']),
    stmt: printStmt,
  }
}

/**
 * The locals a function's body reads, or changes a field of
 * @param {readonly Stmt[]} body - The body
 * @returns {Set<Binding>} Them
 */
function readBindings(body) {
  /** @type {Set<Binding>} */
  const found = new Set()
  /**
   * @param {readonly Stmt[]} stmts - A block
   * @returns {void}
   */
  const visit = (stmts) => {
    for (const stmt of stmts) {
      if (stmt.kind === 'set') {
        found.add(stmt.object)
      }
      for (const inner of blocksOf(stmt)) {
        visit(inner)
      }
    }
  }
  for (const stmt of body) {
    eachInStmt(stmt, (expr) => {
      if (expr.kind === 'local') {
        found.add(expr.binding)
      }
    })
  }
  visit(body)
  return found
}

/**
 * A pattern's source
 * @param {Pattern} pattern - The pattern
 * @param {(binding: Binding) => string} name - Names of locals
 * @returns {string} Its source
 */
function patternText(pattern, name) {
  if (pattern.kind === 'bind') {
    return name(pattern.binding)
  }
  if (pattern.kind === 'tuple') {
    return `[${pattern.items.map((item) => (item === null ? '' : patternText(item, name))).join(', ')}]`
  }
  const fields = pattern.fields.map((field) => {
    const inner = patternText(field.pattern, name)
    return inner === field.name ? inner : `${field.name}: ${inner}`
  })
  return `{ ${fields.join(', ')} }`
}

/**
 * Whether an expression needs no parentheses as an operand
 * @param {Expr} value - The expression
 * @returns {boolean} Whether it is an atom
 */
function isAtom(value) {
  if (value.kind === 'literal') {
    return typeof value.value !== 'number' || value.value >= 0
  }
  return !['binary', 'logical', 'conditional', 'unary', 'has', 'lambda'].includes(value.kind)
}

/**
 * A member access
 * @param {string} name - The field
 * @param {boolean} optional - Whether it is `?.`
 * @returns {string} `.name`, `?.name`, `['name']` or `?.['name']`
 */
function member(name, optional) {
  const access = IDENTIFIER.test(name) ? `.${name}` : `[${quote(name)}]`
  if (!optional) {
    return access
  }
  return access.startsWith('.') ? `?${access}` : `?.${access}`
}

/**
 * A string literal
 * @param {string} text - The string
 * @returns {string} Its source, single-quoted
 */
function quote(text) {
  return `'${text.replaceAll(/[\\']/gu, (char) => `\\${char}`).replaceAll('\n', String.raw`\n`)}'`
}

export { printJs }
