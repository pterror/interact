/**
 * What a framework's component is made from, read from each widget a package exports: its props, the value it binds
 * (the prop the `change` effects of the widget's own step are about), the widget's other own effects that reach the
 * app (its events), its parts by the names the app replaces and styles them by, the states its parts show, the parts
 * whose content is the widget's text, and, for a factory, the widgets it takes and the props each is given by.
 */

import { ARIA_STATES } from '@pterror/interact-core'
import ts from 'typescript'

import { declarationOf, symbolOf } from './program.js'
import { fieldsOf, hasNull, isBoolean, isNumber, isString, membersOf, typeArguments } from './types.js'

/** @import { Source } from './program.js' */

/**
 * The effects the core's host and page carry out, and the composition runtime's own: never an app's event
 */
const CARRIED = new Set([
  'announce',
  'ask',
  'focus',
  'move',
  'preventDefault',
  'reveal',
  'send',
  'stopPropagation',
  'wake',
])

/**
 * A part as the app names it: drawn once or per key, with its role where the view writes it out
 * @typedef {Readonly<{ name: string, perKey: boolean, role: string | null, text: boolean }>} PartInfo
 */

/**
 * What a prop holds, as an attribute can give it: text, a number, a flag, or something only a property can
 * @typedef {'string' | 'number' | 'boolean' | 'other'} Kind
 */

/**
 * A widget a package exports, read for its components. `factory` is a factory's parameters: each a widget it takes
 * (`inside`: the prop whose props that widget is given) or another value
 * @typedef {Readonly<{
 *   name: string,
 *   module: string,
 *   doc: string,
 *   props: readonly string[],
 *   kinds: Readonly<{ [prop: string]: Kind }>,
 *   value: Readonly<{ prop: string, wrapped: boolean, empty: null | boolean | number | string, kind: Kind }> | null,
 *   events: readonly string[],
 *   parts: readonly PartInfo[],
 *   states: readonly string[],
 *   factory: readonly Readonly<{ name: string, doc: string, inside: string | null }>[] | null,
 * }>} Described
 */

/**
 * Reads every widget a package's index exports
 * @param {Source} source - The package's program
 * @param {string} index - The index module, absolute
 * @param {string} root - The directory module paths are given from, with a trailing slash
 * @returns {Readonly<{ widgets: readonly Described[], diagnostics: readonly string[] }>} Each widget, and what
 *   couldn't be read
 */
function describe(source, index, root) {
  const { checker, program } = source
  const file = program.getSourceFile(index)
  const moduleSymbol = file === undefined ? undefined : checker.getSymbolAtLocation(file)
  if (moduleSymbol === undefined) {
    throw new Error(`${index} is not a module in the program`)
  }
  /** @type {string[]} */
  const diagnostics = []
  /** @type {Described[]} */
  const widgets = []
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = (exported.flags & ts.SymbolFlags.Alias) === 0 ? exported : checker.getAliasedSymbol(exported)
    const declaration = declarationOf(symbol)
    if (declaration === null) {
      continue
    }
    const read = readWidget(checker, exported.name, declaration, root)
    if (read === null) {
      continue
    }
    if ('error' in read) {
      diagnostics.push(`${exported.name}: ${read.error}`)
    } else {
      widgets.push(read)
    }
  }
  return { diagnostics, widgets: widgets.toSorted((a, b) => (a.name < b.name ? -1 : 1)) }
}

/**
 * Whether a type is a widget's: it has `init`, `step` and `view`
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is
 */
function isWidgetType(type) {
  return ['init', 'step', 'view'].every((name) => type.getProperty(name) !== undefined)
}

/**
 * Reads one export as a widget, or as a factory of widgets
 * @param {ts.TypeChecker} checker - The checker
 * @param {string} name - The export's name
 * @param {ts.Declaration} declaration - Its declaration
 * @param {string} root - Where module paths are from
 * @returns {Described | Readonly<{ error: string }> | null} The widget, why it can't be read, or `null` for an export
 *   that isn't one
 */
function readWidget(checker, name, declaration, root) {
  const type = checker.getTypeAtLocation(declaration)
  const [signature] = type.getCallSignatures()
  const takesWidget =
    ts.isFunctionDeclaration(declaration) &&
    declaration.parameters.some((parameter) => isWidgetType(checker.getTypeAtLocation(parameter)))
  const widgetType =
    ts.isVariableDeclaration(declaration) && isWidgetType(type)
      ? type
      : takesWidget && signature !== undefined && isWidgetType(signature.getReturnType())
        ? signature.getReturnType()
        : null
  if (widgetType === null) {
    return null
  }
  const spec = specOf(checker, declaration)
  if (spec === null) {
    return { error: 'its widget object, or the spec it is composed from, is not written out where it is declared' }
  }
  if (ts.isFunctionDeclaration(declaration) && !childParams(checker, spec, declaration)) {
    return null
  }
  const fileName = declaration.getSourceFile().fileName
  const module = fileName.startsWith(root) ? fileName.slice(root.length) : fileName
  const props = propsOf(checker, widgetType)
  const effects = ownEffects(checker, spec)
  const value = boundOf(checker, props, effects, pendingFields(checker, spec))
  if (value !== null && 'error' in value) {
    return value
  }
  const parts = partsOf(checker, spec, [])
  if ('error' in parts) {
    return parts
  }
  /** @type {Described['factory']} */
  let factory = null
  if (ts.isFunctionDeclaration(declaration)) {
    factory = declaration.parameters.map((parameter) => {
      const param = parameter.name.getText()
      const isChild = parts.children.includes(param)
      return {
        doc: ts.getJSDocParameterTags(parameter)[0]?.comment?.toString().replace(/^- /u, '') ?? '',
        inside: isChild ? param : null,
        name: param,
      }
    })
  }
  const inside = new Set((factory ?? []).flatMap((param) => (param.inside === null ? [] : [param.inside])))
  const bound = value?.prop
  /** @type {{ [prop: string]: Kind }} */
  const kinds = {}
  for (const [prop, propType] of props) {
    kinds[prop] = kindOf(checker, propType)
  }
  return {
    doc: moduleDoc(declaration.getSourceFile()),
    kinds,
    events: [...effects.keys()].filter((type_) => !CARRIED.has(type_) && type_ !== 'change').toSorted(),
    factory,
    module,
    name,
    parts: parts.parts,
    props: [...props.keys()].filter((prop) => prop !== bound && !inside.has(prop)).toSorted(),
    states: parts.states,
    value,
  }
}

/**
 * Whether a function's spec takes one of its parameters as a child: a factory of widgets around widgets
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.ObjectLiteralExpression} spec - The spec it composes
 * @param {ts.FunctionDeclaration} fn - The function
 * @returns {boolean} Whether it does
 */
function childParams(checker, spec, fn) {
  const kids = propertyOf(spec, 'children')
  const kidsObject = kids === null ? null : objectOf(checker, kids)
  return (kidsObject?.properties ?? []).some((child) => {
    const declaration = ts.isShorthandPropertyAssignment(child)
      ? declared(checker, child)
      : ts.isPropertyAssignment(child)
        ? declared(checker, child.initializer)
        : null
    return declaration !== null && ts.isParameter(declaration) && fn.parameters.includes(declaration)
  })
}

/**
 * The first JSDoc of a module, as one paragraph
 * @param {ts.SourceFile} file - The module
 * @returns {string} Its description
 */
function moduleDoc(file) {
  const match = /^\/\*\*(?<body>[\s\S]*?)\*\//u.exec(file.getFullText())
  const body = match?.groups?.['body'] ?? ''
  return body
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/u, '').trim())
    .filter((line) => line !== '')
    .join(' ')
}

/**
 * Follows an expression to the object literal it is: through parentheses, names, `compose(spec)`, and a function's
 * returns
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Node} node - The expression or declaration
 * @param {number} depth - How far it has followed
 * @returns {ts.ObjectLiteralExpression | null} The literal
 */
function objectOf(checker, node, depth = 0) {
  if (depth > 8) {
    return null
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return objectOf(checker, node.expression, depth + 1)
  }
  if (ts.isVariableDeclaration(node)) {
    return node.initializer === undefined ? null : objectOf(checker, node.initializer, depth + 1)
  }
  if (ts.isCallExpression(node)) {
    const [argument] = node.arguments
    return argument === undefined ? null : objectOf(checker, argument, depth + 1)
  }
  if (ts.isIdentifier(node) || ts.isShorthandPropertyAssignment(node)) {
    const declaration = declared(checker, node)
    return declaration === null ? null : objectOf(checker, declaration, depth + 1)
  }
  if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    for (const returned of returnsOf(node)) {
      const found = objectOf(checker, returned, depth + 1)
      if (found !== null) {
        return found
      }
    }
  }
  return null
}

/**
 * The declaration a name or a shorthand property refers to
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Node} node - The name, or the shorthand
 * @returns {ts.Declaration | null} Its declaration
 */
function declared(checker, node) {
  if (!ts.isShorthandPropertyAssignment(node)) {
    const symbol = symbolOf(checker, node)
    return symbol === null ? null : declarationOf(symbol)
  }
  const symbol = checker.getShorthandAssignmentValueSymbol(node)
  if (symbol === undefined) {
    return null
  }
  return declarationOf((symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol))
}

/**
 * The expressions a function returns
 * @param {ts.SignatureDeclaration} fn - The function
 * @returns {ts.Expression[]} Its returned expressions
 */
function returnsOf(fn) {
  if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) {
    return [fn.body]
  }
  /** @type {ts.Expression[]} */
  const found = []
  /**
   * @param {ts.Node} node - A node in the body
   * @returns {void}
   */
  const visit = (node) => {
    if (ts.isReturnStatement(node) && node.expression !== undefined) {
      found.push(node.expression)
    }
    if (!ts.isFunctionLike(node)) {
      ts.forEachChild(node, visit)
    }
  }
  if ('body' in fn && fn.body !== undefined) {
    ts.forEachChild(fn.body, visit)
  }
  return found
}

/**
 * The object a widget is written as: its own object, or the spec `compose` makes it from
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Declaration} declaration - The export's declaration
 * @returns {ts.ObjectLiteralExpression | null} The object
 */
function specOf(checker, declaration) {
  const found = objectOf(checker, declaration)
  return found?.properties.some((property) => property.name?.getText() === 'view') === true ? found : null
}

/**
 * A property's value in an object literal
 * @param {ts.ObjectLiteralExpression} node - The literal
 * @param {string} name - The property
 * @returns {ts.Node | null} Its value, or the shorthand naming it
 */
function propertyOf(node, name) {
  for (const property of node.properties) {
    if (property.name?.getText() !== name) {
      continue
    }
    if (ts.isPropertyAssignment(property)) {
      return property.initializer
    }
    if (ts.isShorthandPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
      return property
    }
  }
  return null
}

/**
 * A widget's props, by name, with their types
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} widget - The widget's type
 * @returns {Map<string, ts.Type>} Each prop's type
 */
function propsOf(checker, widget) {
  const init = widget.getProperty('init')
  const initType = init === undefined ? null : checker.getTypeOfSymbol(init)
  const [signature] = initType?.getCallSignatures() ?? []
  const [param] = signature?.getParameters() ?? []
  const props = param === undefined ? null : checker.getTypeOfSymbol(param)
  /** @type {Map<string, ts.Type>} */
  const fields = new Map()
  for (const name of props === null ? [] : fieldsOf(checker, props)) {
    const field = props?.getProperty(name)
    if (field !== undefined) {
      fields.set(name, checker.getTypeOfSymbol(field))
    }
  }
  return fields
}

/**
 * The effects a widget's own functions make (its step, init and handlers), by type, each with its record type
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.ObjectLiteralExpression} spec - The widget's object or spec
 * @returns {Map<string, ts.Type>} Each effect type's record
 */
function ownEffects(checker, spec) {
  /** @type {Map<string, ts.Type>} */
  const effects = new Map()
  const step = propertyOf(spec, 'step')
  const stepType = step === null ? null : checker.getTypeAtLocation(step)
  for (const signature of stepType?.getCallSignatures() ?? []) {
    const result = signature.getReturnType()
    const tuple = typeArguments(checker, result)
    const list = tuple[1]
    const element = list === undefined ? null : checker.getIndexTypeOfType(list, ts.IndexKind.Number)
    for (const member of element === null || element === undefined ? [] : membersOf(element)) {
      const typeField = member.getProperty('type')
      const literal = typeField === undefined ? null : checker.getTypeOfSymbol(typeField)
      if (literal?.isStringLiteral() === true) {
        effects.set(literal.value, member)
      }
    }
  }
  return effects
}

/**
 * The fields of a widget's own state that hold a value it changes by the contract's rule (a `Pending`: what the app
 * gave, and the changes not yet settled), read from what its `init` returns
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.ObjectLiteralExpression} spec - The widget's object or spec
 * @returns {Set<string>} Their names
 */
function pendingFields(checker, spec) {
  const init = propertyOf(spec, 'init')
  const initType = init === null ? null : checker.getTypeAtLocation(init)
  /** @type {Set<string>} */
  const found = new Set()
  for (const signature of initType?.getCallSignatures() ?? []) {
    const [own] = typeArguments(checker, signature.getReturnType())
    for (const name of own === undefined ? [] : fieldsOf(checker, own)) {
      const field = own?.getProperty(name)
      const type = field === undefined ? null : checker.getTypeOfSymbol(field)
      if (type?.getProperty('changes') !== undefined && type.getProperty('app') !== undefined) {
        found.add(name)
      }
    }
  }
  return found
}

/**
 * The value a widget binds: the prop whose type is the value its own `change` effects carry, as it is or as
 * `{ value } | null`; of several such props, the one its state holds under its own name as a value it changes
 * @param {ts.TypeChecker} checker - The checker
 * @param {Map<string, ts.Type>} props - The widget's props
 * @param {Map<string, ts.Type>} effects - Its own effects
 * @param {ReadonlySet<string>} pending - The fields of its state holding a value it changes
 * @returns {Described['value'] | Readonly<{ error: string }>} The bound value, none, or why it is unclear
 */
function boundOf(checker, props, effects, pending) {
  const change = effects.get('change')
  const valueField = change?.getProperty('value')
  if (change === undefined || valueField === undefined) {
    return null
  }
  const value = checker.getTypeOfSymbol(valueField)
  const same = (/** @type {ts.Type} */ a, /** @type {ts.Type} */ b) =>
    checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a)
  /** @type {{ prop: string, wrapped: boolean }[]} */
  const found = []
  for (const [prop, type] of props) {
    const inner = checker.getNonNullableType(type).getProperty('value')
    if (hasNull(type) && inner !== undefined && same(checker.getTypeOfSymbol(inner), value)) {
      found.push({ prop, wrapped: true })
    } else if (same(type, value)) {
      found.push({ prop, wrapped: false })
    }
  }
  const held = found.length > 1 ? found.filter((one) => pending.has(one.prop)) : found
  const [only] = held
  if (only === undefined || held.length > 1) {
    return {
      error: `its change effects carry a value no single prop is (${found.map((one) => one.prop).join(', ') || 'none'})`,
    }
  }
  return { empty: emptyOf(value), kind: kindOf(checker, value), ...only }
}

/**
 * What a type holds, as an attribute can give it
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {Kind} Its kind: `string` for a key (an attribute gives a key as text)
 */
function kindOf(checker, type) {
  const given = checker.getNonNullableType(type)
  if (isBoolean(given)) {
    return 'boolean'
  }
  if (isNumber(given)) {
    return 'number'
  }
  return isString(given) || membersOf(given).every((member) => isString(member) || isNumber(member))
    ? 'string'
    : 'other'
}

/**
 * The value a bound value has before any is given or chosen
 * @param {ts.Type} type - The value's type
 * @returns {null | boolean | number | string} Nothing, if it can be nothing; else false, zero or empty text
 */
function emptyOf(type) {
  if (hasNull(type)) {
    return null
  }
  if (isBoolean(type)) {
    return false
  }
  if (isNumber(type)) {
    return 0
  }
  return isString(type) ? '' : null
}

/**
 * The parts a widget's view draws, its children's parts after its own (a child's root named by the child), the states
 * they show, and the children that are a factory's parameters
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.ObjectLiteralExpression} spec - The widget's object or spec
 * @param {readonly ts.ObjectLiteralExpression[]} seen - The specs already being read, outermost first
 * @returns {Readonly<{ parts: PartInfo[], states: string[], children: string[] }> | Readonly<{ error: string }>}
 *   What it draws
 */
function partsOf(checker, spec, seen) {
  const view = propertyOf(spec, 'view')
  const viewFn = view === null ? null : functionOf(checker, view)
  const drawn = viewFn === null ? [] : returnsOf(viewFn).map((returned) => objectOf(checker, returned))
  const [object] = drawn
  if (object === null || object === undefined) {
    return { error: "its view's parts are not written out as an object it returns" }
  }
  /** @type {PartInfo[]} */
  const parts = []
  /** @type {Set<string>} */
  const states = new Set()
  for (const property of object.properties) {
    const name = property.name?.getText()
    if (name === undefined) {
      continue
    }
    const value = ts.isPropertyAssignment(property) ? property.initializer : property
    const literal = partLiteral(checker, value, 0)
    const perKey = ts.isArrowFunction(value) || ts.isFunctionExpression(value)
    parts.push({
      name,
      perKey,
      role: literal === null ? null : roleOf(literal),
      text: literal !== null && hasText(literal),
    })
    for (const state of literal === null ? [] : statesOf(literal)) {
      states.add(state)
    }
  }
  /** @type {string[]} */
  const children = []
  const kids = propertyOf(spec, 'children')
  const kidsObject = kids === null ? null : objectOf(checker, kids)
  for (const child of kidsObject?.properties ?? []) {
    const name = child.name?.getText()
    if (name === undefined) {
      continue
    }
    const declaration = ts.isShorthandPropertyAssignment(child)
      ? declared(checker, child)
      : ts.isPropertyAssignment(child)
        ? declared(checker, child.initializer)
        : null
    if (declaration !== null && ts.isParameter(declaration)) {
      children.push(name)
      continue
    }
    const childSpec = declaration === null ? null : specOf(checker, declaration)
    if (childSpec === null || seen.includes(childSpec)) {
      return { error: `its child ${name} is not a widget written out where it is declared` }
    }
    const inner = partsOf(checker, childSpec, [...seen, spec])
    if ('error' in inner) {
      return inner
    }
    for (const part of inner.parts) {
      parts.push(part.name === 'root' ? { ...part, name } : part)
    }
    for (const state of inner.states) {
      states.add(state)
    }
  }
  return { children, parts, states: [...states].toSorted() }
}

/**
 * The function a property names
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Node} node - The property's value
 * @returns {ts.SignatureDeclaration | null} The function
 */
function functionOf(checker, node) {
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) {
    return node
  }
  const declaration = ts.isShorthandPropertyAssignment(node) || ts.isIdentifier(node) ? declared(checker, node) : null
  if (declaration !== null && ts.isFunctionDeclaration(declaration)) {
    return declaration
  }
  if (declaration !== null && ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
    return functionOf(checker, declaration.initializer)
  }
  return null
}

/**
 * The object a part is made from: the argument of `part({ ... })`, through a function per key and the functions it
 * calls
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Node} node - The part's expression
 * @param {number} depth - How far it has followed
 * @returns {ts.ObjectLiteralExpression | null} The object
 */
function partLiteral(checker, node, depth) {
  if (depth > 6) {
    return null
  }
  if (ts.isCallExpression(node)) {
    const [argument] = node.arguments
    if (node.expression.getText() === 'part') {
      return argument !== undefined && ts.isObjectLiteralExpression(argument) ? argument : null
    }
    const fn = functionOf(checker, node.expression)
    return fn === null ? null : firstPart(checker, fn, depth + 1)
  }
  const fn = functionOf(checker, node)
  return fn === null ? null : firstPart(checker, fn, depth + 1)
}

/**
 * The object of the first part a function returns
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.SignatureDeclaration} fn - The function
 * @param {number} depth - How far it has followed
 * @returns {ts.ObjectLiteralExpression | null} The object
 */
function firstPart(checker, fn, depth) {
  for (const returned of returnsOf(fn)) {
    const found = partLiteral(checker, returned, depth)
    if (found !== null) {
      return found
    }
  }
  return null
}

/**
 * A part's role, where it is written out
 * @param {ts.ObjectLiteralExpression} literal - The part's object
 * @returns {string | null} The role
 */
function roleOf(literal) {
  const role = propertyOf(literal, 'role')
  return role !== null && ts.isStringLiteral(role) ? role.text : null
}

/**
 * Whether a part holds the widget's text
 * @param {ts.ObjectLiteralExpression} literal - The part's object
 * @returns {boolean} Whether a `{ text }` is among its contents
 */
function hasText(literal) {
  const content = propertyOf(literal, 'content')
  let found = false
  /**
   * @param {ts.Node} node - A node of the contents
   * @returns {void}
   */
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'text') {
      found = true
    }
    ts.forEachChild(node, visit)
  }
  if (content !== null) {
    visit(content)
  }
  return found
}

/**
 * The states a part shows: its ARIA states and its `data` fields
 * @param {ts.ObjectLiteralExpression} literal - The part's object
 * @returns {string[]} Their names
 */
function statesOf(literal) {
  const aria = fieldNames(propertyOf(literal, 'aria'))
  return [...aria.filter((name) => ARIA_STATES.includes(name)), ...fieldNames(propertyOf(literal, 'data'))]
}

/**
 * The fields an object literal writes out
 * @param {ts.Node | null} node - The literal
 * @returns {string[]} Their names, none if it isn't one
 */
function fieldNames(node) {
  return node !== null && ts.isObjectLiteralExpression(node)
    ? node.properties.flatMap((property) => (property.name === undefined ? [] : [property.name.getText()]))
    : []
}

export { describe }
