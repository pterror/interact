/**
 * Reads a package's widgets into the intermediate form, checking every function their `init` and `step` reach (and a
 * composite's handlers and child props) against the core's source subset. A rule broken is a diagnostic naming the
 * place; lowering goes on past it, so one run reports them all.
 *
 * The subset: plain data only (`null`, booleans, numbers, strings, arrays, records, no optional fields); `null`,
 * never `undefined` (a value that may be `undefined`, as `find` gives, is only tested, defaulted with `??` or held in a
 * local); conditions are booleans; no classes, `this`, `new`, promises, generators or exceptions; functions are not
 * values except as arguments to array methods; nothing is mutated but a `let`; no reflection (`typeof`,
 * `Array.isArray`, `Object.*`); records and arrays are compared by their contents, never by identity; no sorting
 * (a sort with ties depends on its stability); no Math function the language lets an engine approximate; no global
 * but `Math`, `String` and `undefined`; every type is known (no `any`).
 */

import ts from 'typescript'

import { declarationOf, placeOf, symbolOf } from './program.js'
import { hasUndefined, isBoolean, isCallable, isPrimitive, isString, membersOf, typeArguments } from './types.js'

/** @import { Binding, BinaryOp, Composite, Constant, Entry, Expr, Factory, Fn, Item, Pattern, Stmt, Widget } from './ir.js' */
/** @import { Source } from './program.js' */

/** Math functions whose results the language defines exactly */
const EXACT_MATH = new Set(['abs', 'ceil', 'floor', 'max', 'min', 'round', 'sign', 'sqrt', 'trunc'])

const ARRAY_METHODS = new Set([
  'at',
  'every',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'includes',
  'indexOf',
  'join',
  'lastIndexOf',
  'map',
  'reduce',
  'slice',
  'some',
])
const MUTATING = new Set(['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'splice', 'unshift'])
const STRING_METHODS = new Set([
  'endsWith',
  'includes',
  'indexOf',
  'slice',
  'split',
  'startsWith',
  'toLowerCase',
  'toUpperCase',
  'trim',
])

/** @type {readonly ('on' | 'capture' | 'bubble')[]} */
const PHASES = ['on', 'capture', 'bubble']

/** @type {Readonly<Record<string, BinaryOp>>} */
const BINARY = {
  [ts.SyntaxKind.AsteriskToken]: '*',
  [ts.SyntaxKind.EqualsEqualsEqualsToken]: '===',
  [ts.SyntaxKind.ExclamationEqualsEqualsToken]: '!==',
  [ts.SyntaxKind.GreaterThanEqualsToken]: '>=',
  [ts.SyntaxKind.GreaterThanToken]: '>',
  [ts.SyntaxKind.LessThanEqualsToken]: '<=',
  [ts.SyntaxKind.LessThanToken]: '<',
  [ts.SyntaxKind.MinusToken]: '-',
  [ts.SyntaxKind.PercentToken]: '%',
  [ts.SyntaxKind.PlusToken]: '+',
  [ts.SyntaxKind.SlashToken]: '/',
}

/** @type {ReadonlyMap<ts.SyntaxKind, ts.SyntaxKind>} */
const COMPOUND = new Map([
  [ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.AsteriskToken],
  [ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.MinusToken],
  [ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.PlusToken],
  [ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.SlashToken],
])

/** @type {Readonly<Record<string, '&&' | '||' | '??'>>} */
const LOGICAL = {
  [ts.SyntaxKind.AmpersandAmpersandToken]: '&&',
  [ts.SyntaxKind.BarBarToken]: '||',
  [ts.SyntaxKind.QuestionQuestionToken]: '??',
}

/**
 * What lowering found: the widgets, and every rule broken, as `file:line:column: message`
 * @typedef {Readonly<{ widgets: readonly Widget[], diagnostics: readonly string[] }>} Lowered
 */

/**
 * How lowering reads one name: a local, or something declared at a module's top level
 * @typedef {Readonly<{ kind: 'local', binding: Binding }>
 *   | Readonly<{ kind: 'function', decl: ts.SignatureDeclaration }>
 *   | Readonly<{ kind: 'widget', decl: ts.ObjectLiteralExpression }>
 *   | Readonly<{ kind: 'constant', decl: ts.VariableDeclaration }>
 *   | Readonly<{ kind: 'undefined' }>
 *   | Readonly<{ kind: 'global', name: string }>
 *   | Readonly<{ kind: 'unknown' }>} Resolved
 */

/**
 * Lowers every widget a package's index module exports
 * @param {Source} source - The package's program
 * @param {string} index - The index module, absolute
 * @param {string} root - The directory messages give paths from, with a trailing slash
 * @returns {Lowered} The widgets and the diagnostics
 */
function lower(source, index, root) {
  const { checker, program } = source
  /** @type {string[]} */
  const diagnostics = []
  /** @type {Map<ts.Node, Fn>} */
  const fns = new Map()
  /** @type {Set<ts.Node>} */
  const lowering = new Set()
  /** @type {Map<ts.Node, Constant>} */
  const constants = new Map()
  /** @type {Map<ts.Symbol, Binding>} */
  const scope = new Map()
  let ids = 0

  const indexFile = program.getSourceFile(index)
  if (indexFile === undefined) {
    throw new Error(`${index} is not in the program`)
  }

  /**
   * Records a rule broken
   * @param {ts.Node} node - Where
   * @param {string} message - What
   * @returns {void}
   */
  const report = (node, message) => {
    diagnostics.push(`${placeOf(node, root)}: ${message}`)
  }

  /**
   * The module a node is in, from the root
   * @param {ts.Node} node - The node
   * @returns {string} Its path
   */
  const moduleOf = (node) => {
    const name = node.getSourceFile().fileName
    return name.startsWith(root) ? name.slice(root.length) : name
  }

  /**
   * The type of a node, reporting `any`
   * @param {ts.Node} node - The node
   * @returns {ts.Type} Its type
   */
  const typeOf = (node) => {
    const type = checker.getTypeAtLocation(node)
    if ((type.flags & ts.TypeFlags.Any) !== 0) {
      report(node, `the type of \`${node.getText()}\` isn't known (any): every value has a type`)
    }
    return type
  }

  /**
   * Reports optional fields anywhere in a type: a field that may be absent reads as `undefined`
   * @param {ts.Type} type - The type
   * @param {ts.Node} node - Where it is used
   * @param {Set<ts.Type>} seen - Types already looked at
   * @returns {void}
   */
  const checkData = (type, node, seen = new Set()) => {
    if (seen.has(type)) {
      return
    }
    seen.add(type)
    for (const member of membersOf(type)) {
      if ((member.flags & ts.TypeFlags.Object) === 0 || isCallable(member)) {
        continue
      }
      if (checker.isArrayType(member) || checker.isTupleType(member)) {
        for (const argument of typeArguments(checker, member)) {
          checkData(argument, node, seen)
        }
        continue
      }
      for (const field of checker.getPropertiesOfType(member)) {
        const declaration = declarationOf(field)
        if ((field.flags & ts.SymbolFlags.Optional) !== 0) {
          report(
            declaration ?? node,
            `field \`${field.name}\` is optional: an absent field reads as undefined; give it a value, null for none`,
          )
        }
        checkData(checker.getTypeOfSymbol(field), declaration ?? node, seen)
      }
    }
  }

  /**
   * What a name refers to
   * @param {ts.Identifier} node - The name
   * @returns {Resolved} What it is
   */
  const resolve = (node) => {
    const shorthand = ts.isShorthandPropertyAssignment(node.parent)
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : undefined
    const symbol =
      shorthand === undefined
        ? symbolOf(checker, node)
        : (shorthand.flags & ts.SymbolFlags.Alias) === 0
          ? shorthand
          : checker.getAliasedSymbol(shorthand)
    if (symbol === null) {
      return node.text === 'undefined' ? { kind: 'undefined' } : { kind: 'unknown' }
    }
    const local = scope.get(symbol)
    if (local !== undefined) {
      return { binding: local, kind: 'local' }
    }
    if (
      symbol.flags & ts.SymbolFlags.Transient ||
      (symbol.getDeclarations() ?? []).some((one) => one.getSourceFile().isDeclarationFile)
    ) {
      return node.text === 'undefined' ? { kind: 'undefined' } : { kind: 'global', name: node.text }
    }
    const declaration = declarationOf(symbol)
    if (declaration === null) {
      return { kind: 'unknown' }
    }
    if (ts.isFunctionDeclaration(declaration)) {
      return { decl: declaration, kind: 'function' }
    }
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      const { initializer } = declaration
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        return { decl: initializer, kind: 'function' }
      }
      if (ts.isObjectLiteralExpression(initializer) && isWidgetObject(initializer)) {
        return { decl: initializer, kind: 'widget' }
      }
      return { decl: declaration, kind: 'constant' }
    }
    return { kind: 'unknown' }
  }

  /**
   * A new local
   * @param {string} name - Its name in the source
   * @param {ts.Type} type - Its type
   * @param {boolean} mutable - Whether it is a `let`
   * @returns {Binding} The local
   */
  const bind = (name, type, mutable) => {
    ids += 1
    return { id: ids, mutable, name, type }
  }

  /**
   * Lowers a binding name or pattern, adding its names to the scope
   * @param {ts.BindingName} node - The name or pattern
   * @param {boolean} mutable - Whether it is a `let`
   * @returns {Pattern} The pattern
   */
  const pattern = (node, mutable) => {
    if (ts.isIdentifier(node)) {
      const binding = bind(node.text, typeOf(node), mutable)
      const symbol = checker.getSymbolAtLocation(node)
      if (symbol !== undefined) {
        scope.set(symbol, binding)
      }
      return { binding, kind: 'bind' }
    }
    if (ts.isArrayBindingPattern(node)) {
      return {
        items: node.elements.map((element) => {
          if (ts.isOmittedExpression(element)) {
            return null
          }
          if (element.dotDotDotToken !== undefined || element.initializer !== undefined) {
            report(element, 'a rest element or default in a pattern is not in the subset')
          }
          return pattern(element.name, mutable)
        }),
        kind: 'tuple',
        type: typeOf(node),
      }
    }
    return {
      fields: node.elements.map((element) => {
        if (element.dotDotDotToken !== undefined || element.initializer !== undefined) {
          report(element, 'a rest element or default in a pattern is not in the subset')
        }
        const name = element.propertyName?.getText() ?? element.name.getText()
        return { name, pattern: pattern(element.name, mutable) }
      }),
      kind: 'object',
      type: typeOf(node),
    }
  }

  /**
   * Lowers a function once, wherever it is reached from
   * @param {ts.SignatureDeclaration} decl - Its declaration
   * @param {string} name - Its name, if it has none of its own
   * @param {ts.Node} from - Where it is reached from, for a message about recursion
   * @returns {Fn} The function
   */
  const lowerFn = (decl, name, from) => {
    const known = fns.get(decl)
    if (known !== undefined) {
      if (lowering.has(decl)) {
        report(from, `\`${known.name}\` is reached from itself: the generator takes no recursion`)
      }
      return known
    }
    const signature = checker.getSignatureFromDeclaration(decl)
    if (signature === undefined) {
      throw new Error(`No signature at ${placeOf(decl, root)}`)
    }
    ids += 1
    /** @type {Fn} */
    const fn = {
      at: decl,
      body: [],
      doc: docOf(ts.isArrowFunction(decl) ? decl.parent.parent : decl),
      id: ids,
      module: moduleOf(decl),
      name: decl.name !== undefined && ts.isIdentifier(decl.name) ? decl.name.text : name,
      out: null,
      paramDocs: decl.parameters.map((param) => paramDocOf(param)),
      params: [],
      state: null,
      type: signature,
    }
    if (ts.isArrowFunction(decl) && ts.isVariableDeclaration(decl.parent) && ts.isIdentifier(decl.parent.name)) {
      fn.name = decl.parent.name.text
      fn.doc = docOf(decl.parent.parent.parent)
    }
    fns.set(decl, fn)
    lowering.add(decl)
    const returns = checker.getReturnTypeOfSignature(signature)
    if ((returns.flags & ts.TypeFlags.Any) !== 0) {
      report(decl, `\`${fn.name}\` returns an unknown type (any)`)
    }
    checkData(returns, decl)
    if (ts.isFunctionDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) {
      if (decl.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true) {
        report(decl, 'an async function is not in the subset')
      }
      if ('asteriskToken' in decl && decl.asteriskToken !== undefined) {
        report(decl, 'a generator is not in the subset')
      }
    }
    fn.params = decl.parameters.map((param) => {
      if (param.dotDotDotToken !== undefined || param.initializer !== undefined || param.questionToken !== undefined) {
        report(param, 'a rest, optional or default parameter is not in the subset')
      }
      checkData(typeOf(param), param)
      return pattern(param.name, false)
    })
    const body = 'body' in decl ? decl.body : undefined
    if (body === undefined) {
      report(decl, 'a function without a body is not in the subset')
    } else if (ts.isBlock(body)) {
      fn.body = statements(body.statements)
    } else {
      fn.body = [{ at: body, kind: 'return', value: expr(body) }]
    }
    lowering.delete(decl)
    return fn
  }

  /**
   * Lowers a module-level constant once
   * @param {ts.VariableDeclaration} decl - Its declaration
   * @returns {Constant} The constant
   */
  const lowerConstant = (decl) => {
    const known = constants.get(decl)
    if (known !== undefined) {
      return known
    }
    if (!ts.isIdentifier(decl.name) || decl.initializer === undefined) {
      throw new Error(`A constant at ${placeOf(decl, root)} has no name or value`)
    }
    if ((ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const) === 0) {
      report(decl, 'a module-level `let` is state outside the widget: not in the subset')
    }
    ids += 1
    /** @type {Constant} */
    const constant = {
      at: decl,
      id: ids,
      module: moduleOf(decl),
      name: decl.name.text,
      value: { at: decl, kind: 'literal', type: checker.getNullType(), value: null },
    }
    constants.set(decl, constant)
    constant.value = expr(decl.initializer)
    return constant
  }

  /**
   * Lowers statements
   * @param {readonly ts.Statement[]} nodes - The statements
   * @returns {Stmt[]} The statements
   */
  const statements = (nodes) => nodes.flatMap((node) => statement(node))

  /**
   * Lowers one statement
   * @param {ts.Statement} node - The statement
   * @returns {Stmt[]} The statements it is
   */
  const statement = (node) => {
    if (ts.isVariableStatement(node)) {
      const mutable = (node.declarationList.flags & ts.NodeFlags.Let) !== 0
      /** @type {Stmt[]} */
      const declared = []
      for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer === undefined) {
          report(declaration, 'a local without a value is not in the subset')
          continue
        }
        const value = expr(declaration.initializer, { undefinedOk: !mutable })
        if (mutable) {
          if (!ts.isIdentifier(declaration.name)) {
            report(declaration, 'a `let` destructuring is not in the subset')
            continue
          }
          const binding = bind(declaration.name.text, typeOf(declaration.name), true)
          const symbol = checker.getSymbolAtLocation(declaration.name)
          if (symbol !== undefined) {
            scope.set(symbol, binding)
          }
          declared.push({ at: declaration, binding, kind: 'let', value })
          continue
        }
        declared.push({ at: declaration, kind: 'const', pattern: pattern(declaration.name, false), value })
      }
      return declared
    }
    if (ts.isReturnStatement(node)) {
      if (node.expression === undefined) {
        report(node, 'a step returns a value: `return` alone is not in the subset')
        return []
      }
      return [{ at: node, kind: 'return', value: expr(node.expression) }]
    }
    if (ts.isIfStatement(node)) {
      return [
        {
          at: node,
          kind: 'if',
          whenFalse: node.elseStatement === undefined ? [] : block(node.elseStatement),
          test: condition(node.expression),
          whenTrue: block(node.thenStatement),
        },
      ]
    }
    if (ts.isBlock(node)) {
      return statements(node.statements)
    }
    if (ts.isSwitchStatement(node)) {
      return [switchStatement(node)]
    }
    if (ts.isWhileStatement(node)) {
      return [{ at: node, body: block(node.statement), kind: 'while', test: condition(node.expression) }]
    }
    if (ts.isExpressionStatement(node)) {
      return assignment(node)
    }
    if (ts.isThrowStatement(node)) {
      report(node, 'a step is total: `throw` is not in the subset')
      return []
    }
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      report(node, 'a function or class declared inside a function is not in the subset')
      return []
    }
    report(node, `this kind of statement (${ts.SyntaxKind[node.kind]}) is not in the subset`)
    return []
  }

  /**
   * Lowers a statement that is a block's body
   * @param {ts.Statement} node - The statement
   * @returns {Stmt[]} The block
   */
  const block = (node) => (ts.isBlock(node) ? statements(node.statements) : statement(node))

  /**
   * Lowers a `switch`: every case ends in a `return`, or is empty and shares the next one's body
   * @param {ts.SwitchStatement} node - The statement
   * @returns {Stmt} The statement
   */
  const switchStatement = (node) => {
    /** @type {{ tests: Expr[], body: Stmt[] }[]} */
    const cases = []
    /** @type {Stmt[] | null} */
    let fallback = null
    /** @type {Expr[]} */
    let tests = []
    for (const clause of node.caseBlock.clauses) {
      const body = statements(clause.statements)
      if (ts.isDefaultClause(clause)) {
        if (tests.length > 0) {
          report(clause, 'a case falling into `default` is not in the subset')
        }
        fallback = body
        continue
      }
      tests.push(expr(clause.expression))
      if (clause.statements.length > 0) {
        cases.push({ body, tests })
        tests = []
      }
    }
    return { at: node, cases, fallback, kind: 'switch', subject: expr(node.expression) }
  }

  /**
   * Lowers an expression statement: an assignment to a `let`
   * @param {ts.ExpressionStatement} node - The statement
   * @returns {Stmt[]} The assignment
   */
  const assignment = (node) => {
    const { expression } = node
    if (ts.isBinaryExpression(expression) && ts.isIdentifier(expression.left)) {
      const target = resolve(expression.left)
      const op = expression.operatorToken.kind
      const compound = COMPOUND.get(op)
      if (target.kind === 'local' && target.binding.mutable) {
        const value = expr(expression.right)
        if (op === ts.SyntaxKind.EqualsToken) {
          return [{ at: node, binding: target.binding, kind: 'assign', value }]
        }
        const binary = compound === undefined ? undefined : BINARY[compound]
        if (binary !== undefined) {
          /** @type {Expr} */
          const current = { at: expression.left, binding: target.binding, kind: 'local', type: target.binding.type }
          return [
            {
              at: node,
              binding: target.binding,
              kind: 'assign',
              value: {
                at: expression,
                kind: 'binary',
                left: current,
                op: binary,
                right: value,
                type: typeOf(expression),
              },
            },
          ]
        }
      }
    }
    if (
      (ts.isPostfixUnaryExpression(expression) || ts.isPrefixUnaryExpression(expression)) &&
      ts.isIdentifier(expression.operand) &&
      (expression.operator === ts.SyntaxKind.PlusPlusToken || expression.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      const target = resolve(expression.operand)
      if (target.kind === 'local' && target.binding.mutable) {
        const type = target.binding.type
        /** @type {Expr} */
        const current = { at: expression.operand, binding: target.binding, kind: 'local', type }
        /** @type {Expr} */
        const one = { at: expression, kind: 'literal', type: checker.getNumberType(), value: 1 }
        const op = expression.operator === ts.SyntaxKind.PlusPlusToken ? '+' : '-'
        return [
          {
            at: node,
            binding: target.binding,
            kind: 'assign',
            value: { at: expression, kind: 'binary', left: current, op, right: one, type },
          },
        ]
      }
    }
    report(node, 'a statement that is an expression changes something: only assigning a `let` is in the subset')
    return []
  }

  /**
   * Lowers a condition: a boolean
   * @param {ts.Expression} node - The condition
   * @returns {Expr} The condition
   */
  const condition = (node) => {
    const lowered = expr(node)
    if (!isBoolean(lowered.type)) {
      report(
        node,
        `\`${node.getText()}\` is ${checker.typeToString(lowered.type)}, not a boolean: conditions are booleans (compare it)`,
      )
    }
    return lowered
  }

  /**
   * Lowers an expression
   * @param {ts.Expression} node - The expression
   * @param {Readonly<{ undefinedOk?: boolean, comparison?: boolean }>} context - Whether it may be `undefined` here, and
   *   whether it is compared with `===` or `!==`
   * @returns {Expr} The expression
   */
  const expr = (node, context = {}) => {
    const lowered = exprOf(node)
    if (lowered.kind === 'undefined' && context.comparison !== true) {
      report(node, '`undefined` is not a value in the subset: use null')
    }
    if (
      context.undefinedOk !== true &&
      lowered.kind !== 'undefined' &&
      hasUndefined(lowered.type) &&
      !(lowered.type.flags & ts.TypeFlags.Any)
    ) {
      report(
        node,
        `\`${node.getText()}\` may be undefined here: test it (\`=== undefined\`), default it (\`??\`) or keep it in a local first`,
      )
    }
    if (isCallable(lowered.type) && lowered.kind !== 'lambda' && lowered.kind !== 'function') {
      report(node, `\`${node.getText()}\` is a function value: functions are not data`)
    }
    return lowered
  }

  /**
   * Lowers an expression, its context aside
   * @param {ts.Expression} node - The expression
   * @returns {Expr} The expression
   */
  const exprOf = (node) => {
    const type = typeOf(node)
    const at = node
    if (ts.isParenthesizedExpression(node)) {
      return expr(node.expression, { undefinedOk: true })
    }
    if (ts.isNumericLiteral(node)) {
      return { at, kind: 'literal', type, value: Number(node.text) }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return { at, kind: 'literal', type, value: node.text }
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
      return { at, kind: 'literal', type, value: node.kind === ts.SyntaxKind.TrueKeyword }
    }
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return { at, kind: 'literal', type, value: null }
    }
    if (ts.isIdentifier(node)) {
      return identifier(node, type)
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (node.name.kind === ts.SyntaxKind.PrivateIdentifier) {
        report(node, 'a private name is not in the subset')
      }
      const object = expr(node.expression, { undefinedOk: node.questionDotToken !== undefined })
      return { at, kind: 'field', name: node.name.text, object, optional: node.questionDotToken !== undefined, type }
    }
    if (ts.isElementAccessExpression(node)) {
      const object = expr(node.expression, { undefinedOk: node.questionDotToken !== undefined })
      if (ts.isStringLiteral(node.argumentExpression)) {
        return { at, kind: 'field', name: node.argumentExpression.text, object, optional: false, type }
      }
      return { at, index: expr(node.argumentExpression), kind: 'index', object, type }
    }
    if (ts.isObjectLiteralExpression(node)) {
      return record(node, type)
    }
    if (ts.isArrayLiteralExpression(node)) {
      /** @type {Item[]} */
      const items = node.elements.map((element) =>
        ts.isSpreadElement(element)
          ? { spread: true, value: expr(element.expression) }
          : { spread: false, value: expr(element) },
      )
      return { at, items, kind: 'array', type }
    }
    if (ts.isCallExpression(node)) {
      return call(node, type)
    }
    if (ts.isPrefixUnaryExpression(node)) {
      if (node.operator === ts.SyntaxKind.ExclamationToken) {
        return { at, kind: 'unary', op: '!', operand: condition(node.operand), type }
      }
      if (node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
        return { at, kind: 'literal', type, value: -Number(node.operand.text) }
      }
      if (node.operator === ts.SyntaxKind.MinusToken) {
        return { at, kind: 'unary', op: '-', operand: expr(node.operand), type }
      }
      report(node, `\`${node.getText()}\`: this operator is not in the subset`)
      return { at, kind: 'literal', type, value: null }
    }
    if (ts.isBinaryExpression(node)) {
      return binary(node, type)
    }
    if (ts.isConditionalExpression(node)) {
      return {
        at,
        kind: 'conditional',
        whenFalse: expr(node.whenFalse, { undefinedOk: true }),
        test: condition(node.condition),
        whenTrue: expr(node.whenTrue, { undefinedOk: true }),
        type,
      }
    }
    if (ts.isTemplateExpression(node)) {
      /** @type {(string | Expr)[]} */
      const parts = [node.head.text]
      for (const span of node.templateSpans) {
        parts.push(expr(span.expression), span.literal.text)
      }
      return { at, kind: 'template', parts: parts.filter((part) => part !== ''), type }
    }
    if (ts.isRegularExpressionLiteral(node)) {
      const text = node.text
      const end = text.lastIndexOf('/')
      return { at, flags: text.slice(end + 1), kind: 'regex', pattern: text.slice(1, end), type }
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      report(node, 'a function here is a value: functions are only arguments to array methods')
      return { at, kind: 'literal', type, value: null }
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      report(node, '`this` is not in the subset')
    } else if (ts.isNewExpression(node)) {
      report(node, '`new` is not in the subset: values are plain data')
    } else if (ts.isTypeOfExpression(node)) {
      report(node, '`typeof` reads what a value is at run time: the subset knows it from its type')
    } else if (ts.isAwaitExpression(node) || ts.isYieldExpression(node)) {
      report(node, '`await` and `yield` are not in the subset')
    } else if (ts.isDeleteExpression(node)) {
      report(node, '`delete` mutates a record: not in the subset')
    } else {
      report(node, `this kind of expression (${ts.SyntaxKind[node.kind]}) is not in the subset`)
    }
    return { at, kind: 'literal', type, value: null }
  }

  /**
   * Lowers a name
   * @param {ts.Identifier} node - The name
   * @param {ts.Type} type - Its type
   * @returns {Expr} What it reads
   */
  const identifier = (node, type) => {
    const at = node
    const target = resolve(node)
    switch (target.kind) {
      case 'local': {
        return { at, binding: target.binding, kind: 'local', type }
      }
      case 'constant': {
        return { at, constant: lowerConstant(target.decl), kind: 'constant', type }
      }
      case 'function': {
        return { at, fn: lowerFn(target.decl, node.text, node), kind: 'function', type }
      }
      case 'undefined': {
        return { at, kind: 'undefined', type }
      }
      case 'widget': {
        report(node, 'a widget is not a value here: call its `init` or `step`')
        return { at, kind: 'literal', type, value: null }
      }
      case 'global': {
        report(node, `the global \`${target.name}\` is outside the widget: not in the subset`)
        return { at, kind: 'literal', type, value: null }
      }
      case 'unknown': {
        report(node, `\`${node.text}\` isn't declared where the generator can read it`)
        return { at, kind: 'literal', type, value: null }
      }
      default: {
        throw new TypeError('Not a name')
      }
    }
  }

  /**
   * Lowers an object literal
   * @param {ts.ObjectLiteralExpression} node - The literal
   * @param {ts.Type} type - Its type
   * @returns {Expr} The record
   */
  const record = (node, type) => {
    /** @type {Entry[]} */
    const entries = []
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        entries.push({ kind: 'spread', value: expr(property.expression) })
      } else if (ts.isPropertyAssignment(property)) {
        const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : null
        if (name === null) {
          report(property, 'a computed field name is not in the subset')
          continue
        }
        entries.push({ kind: 'field', name, value: expr(property.initializer) })
      } else if (ts.isShorthandPropertyAssignment(property)) {
        entries.push({ kind: 'field', name: property.name.text, value: expr(property.name) })
      } else {
        report(property, 'a method, getter or setter in a record: records are plain data')
      }
    }
    return { at: node, entries, kind: 'record', type }
  }

  /**
   * Lowers a function argument to an array method: a function, or a function's name
   * @param {ts.Expression} node - The argument
   * @returns {Expr} The function
   */
  const callback = (node) => {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const params = node.parameters.map((param) => {
        if (param.dotDotDotToken !== undefined || param.initializer !== undefined) {
          report(param, 'a rest or default parameter is not in the subset')
        }
        return pattern(param.name, false)
      })
      /** @type {Stmt[]} */
      const body = ts.isBlock(node.body)
        ? statements(node.body.statements)
        : [{ at: node.body, kind: 'return', value: expr(node.body, { undefinedOk: true }) }]
      return { at: node, body, kind: 'lambda', params, type: typeOf(node) }
    }
    if (ts.isIdentifier(node)) {
      const target = resolve(node)
      if (target.kind === 'function') {
        return { at: node, fn: lowerFn(target.decl, node.text, node), kind: 'function', type: typeOf(node) }
      }
    }
    return expr(node)
  }

  /**
   * Lowers a call
   * @param {ts.CallExpression} node - The call
   * @param {ts.Type} type - Its type
   * @returns {Expr} The call
   */
  const call = (node, type) => {
    const at = node
    const { expression } = node
    if (node.questionDotToken !== undefined) {
      report(node, 'an optional call is not in the subset')
    }
    if (node.arguments.some((argument) => ts.isSpreadElement(argument))) {
      report(node, 'spreading arguments is not in the subset')
    }
    if (ts.isIdentifier(expression)) {
      const target = resolve(expression)
      if (target.kind === 'function') {
        const fn = lowerFn(target.decl, expression.text, node)
        return { args: node.arguments.map((argument) => expr(argument)), at, fn, kind: 'call', type }
      }
      if (target.kind === 'global' && target.name === 'String') {
        return { args: node.arguments.map((argument) => expr(argument)), at, kind: 'builtin', name: 'String', type }
      }
      report(expression, `\`${expression.text}\` is not a function the generator can read`)
      return { at, kind: 'literal', type, value: null }
    }
    if (!ts.isPropertyAccessExpression(expression)) {
      report(node, 'this kind of call is not in the subset')
      return { at, kind: 'literal', type, value: null }
    }
    const name = expression.name.text
    const owner = expression.expression
    if (ts.isIdentifier(owner)) {
      const target = resolve(owner)
      if (target.kind === 'global') {
        return builtin(node, target.name, name, type)
      }
      if (target.kind === 'widget') {
        const fnNode = propertyOf(target.decl, name)
        const fn = fnNode === null ? null : functionAt(fnNode, name)
        if (fn === null) {
          report(node, `the widget has no function \`${name}\``)
          return { at, kind: 'literal', type, value: null }
        }
        return { args: node.arguments.map((argument) => expr(argument)), at, fn, kind: 'call', type }
      }
    }
    const object = expr(owner, { undefinedOk: expression.questionDotToken !== undefined })
    const objectType = checker.getNonNullableType(object.type)
    if (isString(objectType)) {
      if (!STRING_METHODS.has(name)) {
        report(node, `the string method \`${name}\` is not in the subset`)
      }
    } else if (checker.isArrayType(objectType) || checker.isTupleType(objectType)) {
      if (MUTATING.has(name)) {
        report(node, `\`${name}\` mutates an array: values are never changed in place`)
      } else if (name === 'sort' || name === 'toSorted') {
        report(node, `\`${name}\`: a sort with ties depends on whether it is stable; not in the subset`)
      } else if (!ARRAY_METHODS.has(name)) {
        report(node, `the array method \`${name}\` is not in the subset`)
      }
      if ((name === 'includes' || name === 'indexOf' || name === 'lastIndexOf') && object.kind !== 'literal') {
        const element = checker.getIndexTypeOfType(objectType, ts.IndexKind.Number)
        if (element !== undefined && !isPrimitive(checker, element)) {
          report(node, `\`${name}\` compares records by identity: plain data has none; compare a field`)
        }
      }
    } else if (object.kind !== 'regex' || name !== 'test') {
      report(node, `\`${expression.getText()}\` is not a call the subset has`)
    }
    const args = node.arguments.map((argument) => callback(argument))
    return { args, at, kind: 'method', name, object, type }
  }

  /**
   * The function a widget object's property names
   * @param {ts.Expression} node - The property's value
   * @param {string} name - The property
   * @returns {Fn | null} The function
   */
  const functionAt = (node, name) => {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return lowerFn(node, name, node)
    }
    if (ts.isIdentifier(node)) {
      const target = resolve(node)
      if (target.kind === 'function') {
        return lowerFn(target.decl, name, node)
      }
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const target = resolve(node.expression)
      if (target.kind === 'widget') {
        const inner = propertyOf(target.decl, node.name.text)
        return inner === null ? null : functionAt(inner, name)
      }
    }
    report(node, `\`${node.getText()}\` is not a function the generator can read`)
    return null
  }

  /**
   * Lowers a call of a global's function
   * @param {ts.CallExpression} node - The call
   * @param {string} owner - The global
   * @param {string} name - The function
   * @param {ts.Type} type - The call's type
   * @returns {Expr} The call
   */
  const builtin = (node, owner, name, type) => {
    const args = node.arguments.map((argument) => expr(argument))
    if (owner === 'Math' && EXACT_MATH.has(name)) {
      return { args, at: node, kind: 'builtin', name: `Math.${name}`, type }
    }
    if (owner === 'Math') {
      report(
        node,
        name === 'random'
          ? '`Math.random` is not pure'
          : `\`Math.${name}\` may be approximated by the engine (ECMA-262 lets it), so a step's result would depend on where it runs`,
      )
    } else if (owner === 'Object' || owner === 'Array' || owner === 'Reflect') {
      report(node, `\`${owner}.${name}\` reads a value's shape at run time: the subset knows it from its type`)
    } else {
      report(node, `\`${owner}.${name}\` is outside the widget: not in the subset`)
    }
    return { at: node, kind: 'literal', type, value: null }
  }

  /**
   * Lowers a binary expression
   * @param {ts.BinaryExpression} node - The expression
   * @param {ts.Type} type - Its type
   * @returns {Expr} The expression
   */
  const binary = (node, type) => {
    const at = node
    const token = node.operatorToken.kind
    const logical = LOGICAL[token]
    if (logical === '??') {
      return {
        at,
        kind: 'logical',
        left: expr(node.left, { undefinedOk: true }),
        op: '??',
        right: expr(node.right),
        type,
      }
    }
    if (logical !== undefined) {
      return { at, kind: 'logical', left: condition(node.left), op: logical, right: condition(node.right), type }
    }
    if (token === ts.SyntaxKind.InKeyword) {
      if (!ts.isStringLiteral(node.left)) {
        report(node, '`in` takes a field name written out')
        return { at, kind: 'literal', type, value: null }
      }
      return { at, kind: 'has', name: node.left.text, object: expr(node.right), type }
    }
    const op = BINARY[token]
    if (op === undefined) {
      report(node, `\`${node.operatorToken.getText()}\` is not in the subset`)
      return { at, kind: 'literal', type, value: null }
    }
    const comparesUndefined =
      (op === '===' || op === '!==') &&
      (node.left.kind === ts.SyntaxKind.Identifier || node.right.kind === ts.SyntaxKind.Identifier) &&
      (node.left.getText() === 'undefined' || node.right.getText() === 'undefined')
    const compared = op === '===' || op === '!=='
    const left = expr(node.left, { comparison: compared, undefinedOk: comparesUndefined })
    const right = expr(node.right, { comparison: compared, undefinedOk: comparesUndefined })
    if (op === '===' || op === '!==') {
      if (
        !nullish(left) &&
        !nullish(right) &&
        (!isPrimitive(checker, left.type) || !isPrimitive(checker, right.type))
      ) {
        report(node, `\`${node.getText()}\` compares by identity: plain data has none; compare what identifies it`)
      }
    }
    if (op === '+' && isString(left.type) !== isString(right.type)) {
      report(node, '`+` of a string and a number converts the number: write `String(n)`')
    }
    return { at, kind: 'binary', left, op, right, type }
  }

  /**
   * A widget's `children`, `props` and handlers, from a `compose` spec
   * @param {ts.ObjectLiteralExpression} spec - The spec
   * @returns {Composite} The composite's parts
   */
  const composite = (spec) => {
    /**
     * An object literal property of the spec
     * @param {string} name - The property
     * @returns {ts.ObjectLiteralExpression | null} Its value
     */
    const objectAt = (name) => {
      const value = propertyOf(spec, name)
      return value !== null && ts.isObjectLiteralExpression(value) ? value : null
    }
    const childrenNode = objectAt('children')
    /** @type {Composite['children'][number][]} */
    const children = []
    for (const property of childrenNode?.properties ?? []) {
      const childName = property.name?.getText() ?? ''
      const value = propertyOf(childrenNode ?? spec, childName)
      if (value === null || !ts.isIdentifier(value)) {
        report(property, 'a child is a widget named here')
        continue
      }
      const target = resolve(value)
      if (target.kind === 'local') {
        children.push({ name: childName, widget: { binding: target.binding, kind: 'param' } })
      } else if (
        target.kind === 'widget' &&
        ts.isVariableDeclaration(target.decl.parent) &&
        ts.isIdentifier(target.decl.parent.name)
      ) {
        children.push({
          name: childName,
          widget: { kind: 'export', module: moduleOf(target.decl), name: target.decl.parent.name.text },
        })
      } else {
        report(value, 'a child is a widget a module exports, or a factory parameter')
      }
    }
    const propsNode = objectAt('props')
    const props = (propsNode?.properties ?? []).flatMap((property) => {
      const child = property.name?.getText() ?? ''
      const value = propsNode === null ? null : propertyOf(propsNode, child)
      const fn = value === null ? null : functionAt(value, `${child}Props`)
      return fn === null ? [] : [{ child, fn }]
    })
    /** @type {Composite['handlers'][number][]} */
    const handlers = []
    for (const phase of PHASES) {
      const phaseNode = objectAt(phase)
      for (const childProperty of phaseNode?.properties ?? []) {
        const child = childProperty.name?.getText() ?? ''
        const byType = phaseNode === null ? null : propertyOf(phaseNode, child)
        if (byType === null || !ts.isObjectLiteralExpression(byType)) {
          continue
        }
        for (const typeProperty of byType.properties) {
          const type = typeProperty.name?.getText() ?? ''
          const value = propertyOf(byType, type)
          const name = `${phase}${capital(child)}${capital(type)}`
          const fn = value === null ? null : functionAt(value, name)
          if (fn !== null) {
            if (ts.isArrowFunction(value ?? spec) || ts.isFunctionExpression(value ?? spec)) {
              fn.name = name
            }
            handlers.push({ child, fn, phase, type })
          }
        }
      }
    }
    return { children, handlers, props }
  }

  /**
   * A widget from the object literal or `compose` spec that makes it
   * @param {string} name - The widget's name
   * @param {ts.Expression} node - The literal, or the call of `compose`
   * @param {Factory | null} factory - The factory it is made in
   * @returns {Widget | null} The widget
   */
  const widgetAt = (name, node, factory) => {
    let spec = node
    let isComposite = false
    if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const [argument] = node.arguments
      isComposite = true
      spec = argument ?? node
      if (ts.isIdentifier(spec)) {
        const target = symbolOf(checker, spec)
        const declaration = target === null ? null : declarationOf(target)
        if (declaration !== null && ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
          spec = declaration.initializer
        }
      }
    }
    if (!ts.isObjectLiteralExpression(spec)) {
      report(node, `\`${name}\` is made in a way the generator can't read`)
      return null
    }
    const initNode = propertyOf(spec, 'init')
    const stepNode = propertyOf(spec, 'step')
    const init = initNode === null ? null : functionAt(initNode, 'init')
    const step = stepNode === null ? null : functionAt(stepNode, 'step')
    if (init === null || step === null) {
      report(spec, `\`${name}\` has no \`init\` or \`step\` the generator can read`)
      return null
    }
    return {
      composite: isComposite ? composite(spec) : null,
      factory,
      init,
      module: moduleOf(node),
      name,
      step,
    }
  }

  /**
   * A widget a factory function makes: its parameters and constants, and the widget it returns
   * @param {string} name - The factory's name
   * @param {ts.FunctionDeclaration} decl - The factory
   * @returns {Widget | null} The widget
   */
  const factoryAt = (name, decl) => {
    if (decl.body === undefined) {
      return null
    }
    const params = decl.parameters.map((param) => {
      if (!ts.isIdentifier(param.name)) {
        report(param, "a factory's parameter is a name")
      }
      const binding = bind(param.name.getText(), typeOf(param), false)
      const symbol = checker.getSymbolAtLocation(param.name)
      if (symbol !== undefined) {
        scope.set(symbol, binding)
      }
      return binding
    })
    /** @type {Stmt[]} */
    const locals = []
    /** @type {ts.Expression | null} */
    let made = null
    for (const node of decl.body.statements) {
      if (ts.isReturnStatement(node) && node.expression !== undefined) {
        made = node.expression
      } else if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          const { initializer } = declaration
          const isFunction =
            initializer !== undefined && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
          const isSpec = initializer !== undefined && ts.isObjectLiteralExpression(initializer)
          if (!isFunction && !isSpec) {
            locals.push(...statement(node))
          }
        }
      } else {
        report(node, 'a factory holds constants and returns its widget')
      }
    }
    if (made === null || !ts.isCallExpression(made)) {
      return null
    }
    /** @type {Factory} */
    const factory = {
      at: decl,
      doc: docOf(decl),
      locals,
      name,
      paramDocs: decl.parameters.map((param) => paramDocOf(param)),
      params,
    }
    return widgetAt(name, made, factory)
  }

  const moduleSymbol = checker.getSymbolAtLocation(indexFile)
  /** @type {Widget[]} */
  const widgets = []
  for (const exported of moduleSymbol === undefined ? [] : checker.getExportsOfModule(moduleSymbol)) {
    const symbol = (exported.flags & ts.SymbolFlags.Alias) === 0 ? exported : checker.getAliasedSymbol(exported)
    const declaration = declarationOf(symbol)
    if (declaration === null) {
      continue
    }
    const type = checker.getTypeOfSymbol(symbol)
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined && isWidget(type)) {
      const widget = widgetAt(exported.name, declaration.initializer, null)
      if (widget !== null) {
        widgets.push(widget)
      }
    } else if (
      ts.isFunctionDeclaration(declaration) &&
      type.getCallSignatures().some((signature) => isWidget(signature.getReturnType()))
    ) {
      const widget = factoryAt(exported.name, declaration)
      if (widget !== null) {
        widgets.push(widget)
      }
    }
  }
  return { diagnostics: [...new Set(diagnostics)], widgets }
}

/**
 * Whether an expression is `null` or `undefined` written out
 * @param {Expr} side - The expression
 * @returns {boolean} Whether it is
 */
function nullish(side) {
  return side.kind === 'undefined' || (side.kind === 'literal' && side.value === null)
}

/**
 * Whether a type is a widget's: it has `init` and `step`
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is
 */
function isWidget(type) {
  return type.getProperty('init') !== undefined && type.getProperty('step') !== undefined
}

/**
 * A name with its first letter capital
 * @param {string} name - The name
 * @returns {string} It, capitalized
 */
function capital(name) {
  return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
}

/**
 * Whether an object literal is a widget: it has `init` and `step`
 * @param {ts.ObjectLiteralExpression} node - The literal
 * @returns {boolean} Whether it is one
 */
function isWidgetObject(node) {
  const names = new Set(node.properties.map((property) => property.name?.getText()))
  return names.has('init') && names.has('step')
}

/**
 * The value of one property of an object literal
 * @param {ts.ObjectLiteralExpression} node - The literal
 * @param {string} name - The property
 * @returns {ts.Expression | null} Its value, a shorthand's name
 */
function propertyOf(node, name) {
  for (const property of node.properties) {
    if (property.name?.getText() !== name) {
      continue
    }
    if (ts.isPropertyAssignment(property)) {
      return property.initializer
    }
    if (ts.isShorthandPropertyAssignment(property)) {
      return property.name
    }
  }
  return null
}

/**
 * The JSDoc description of a declaration
 * @param {ts.Node} node - The declaration
 * @returns {string} Its description, or `''`
 */
function docOf(node) {
  const doc = ts.getJSDocCommentsAndTags(node).find((one) => ts.isJSDoc(one))
  const comment = doc === undefined ? undefined : doc.comment
  return typeof comment === 'string' ? comment : ''
}

/**
 * The description of a parameter, from its function's JSDoc
 * @param {ts.ParameterDeclaration} node - The parameter
 * @returns {string} Its description, or `''`
 */
function paramDocOf(node) {
  const [tag] = ts.getJSDocParameterTags(node)
  const comment = tag?.comment
  return typeof comment === 'string' ? comment.replace(/^- /u, '') : ''
}

export { lower }
