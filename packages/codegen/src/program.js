/**
 * The widget sources as TypeScript reads them: a program over a package's tsconfig, its checker, and where a name in
 * it is declared. TypeScript's own diagnostics are not reported here: tsgo checks the sources in `bun run check`.
 */

import ts from 'typescript'

/**
 * A program over one package
 * @typedef {Readonly<{ program: ts.Program, checker: ts.TypeChecker }>} Source
 */

/**
 * Reads a package's sources as its tsconfig names them
 * @param {string} tsconfig - The tsconfig's path, absolute
 * @returns {Source} The program and its checker
 */
function load(tsconfig) {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    tsconfig,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      },
    },
  )
  if (parsed === undefined) {
    throw new Error(`No tsconfig at ${tsconfig}`)
  }
  const program = ts.createProgram({ options: parsed.options, rootNames: parsed.fileNames })
  return { checker: program.getTypeChecker(), program }
}

/**
 * Reads sources given as text, checked as the repo checks its JavaScript: for testing the subset checker on samples
 * @param {Readonly<Record<string, string>>} files - Each file's text, by absolute path
 * @returns {Source} The program and its checker
 */
function loadFiles(files) {
  /** @type {ts.CompilerOptions} */
  const options = {
    allowJs: true,
    checkJs: true,
    exactOptionalPropertyTypes: true,
    lib: ['lib.esnext.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    noUncheckedIndexedAccess: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
    types: [],
  }
  const base = ts.createCompilerHost(options)
  /** @type {ts.CompilerHost} */
  const host = {
    ...base,
    /**
     * @param {string} name - A directory
     * @returns {boolean} Whether it is one
     */
    directoryExists: (name) =>
      Object.keys(files).some((file) => file.startsWith(`${name}/`)) || base.directoryExists?.(name) === true,
    /**
     * @param {string} name - A file
     * @returns {boolean} Whether it is one
     */
    fileExists: (name) => name in files || base.fileExists(name),
    /**
     * @param {string} name - A file
     * @param {ts.ScriptTarget | ts.CreateSourceFileOptions} version - How to parse it
     * @returns {ts.SourceFile | undefined} It, parsed
     */
    getSourceFile: (name, version) => {
      const text = files[name]
      return text === undefined ? base.getSourceFile(name, version) : ts.createSourceFile(name, text, version, true)
    },
    /**
     * @param {string} name - A file
     * @returns {string | undefined} Its text
     */
    readFile: (name) => files[name] ?? base.readFile(name),
    /**
     * @param {string} name - A path
     * @returns {string} The same: the files given are where they say
     */
    realpath: (name) => name,
  }
  const program = ts.createProgram({ host, options, rootNames: Object.keys(files) })
  return { checker: program.getTypeChecker(), program }
}

/**
 * The symbol a name refers to, through any import
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Node} node - The name
 * @returns {ts.Symbol | null} Its symbol
 */
function symbolOf(checker, node) {
  const symbol = checker.getSymbolAtLocation(node)
  if (symbol === undefined) {
    return null
  }
  return (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)
}

/**
 * The one declaration of a symbol
 * @param {ts.Symbol} symbol - The symbol
 * @returns {ts.Declaration | null} Its declaration, or `null` if it has none or several
 */
function declarationOf(symbol) {
  const declarations = symbol.getDeclarations() ?? []
  const [only] = declarations
  return declarations.length === 1 && only !== undefined ? only : null
}

/**
 * Where a node is, for a message: `file:line:column`
 * @param {ts.Node} node - The node
 * @param {string} root - The directory paths are given from
 * @returns {string} The place
 */
function placeOf(node, root) {
  const file = node.getSourceFile()
  const { character, line } = file.getLineAndCharacterOfPosition(node.getStart())
  const name = file.fileName.startsWith(root) ? file.fileName.slice(root.length) : file.fileName
  return `${name}:${String(line + 1)}:${String(character + 1)}`
}

export { declarationOf, load, loadFiles, placeOf, symbolOf }
