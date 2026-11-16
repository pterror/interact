/**
 * Each framework's components, written from the widgets as `describe` reads them: per widget, a module (or, for
 * Svelte, a component file per syntax) giving the framework's glue the widget's description and typing its props by
 * the widget's own types, and an index. A factory of widgets (the dialog) gives a factory of components, or for
 * Svelte, a component taking the factory's arguments as `of`.
 */

/** @import { Described } from './components.js' */

/**
 * The files a framework's package gets, by path from its `src`
 * @typedef {ReadonlyMap<string, string>} Files
 */

/**
 * A name with its first letter capital
 * @param {string} name - The name
 * @returns {string} It, capitalised
 */
function capital(name) {
  return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`
}

/**
 * The module a widget is imported from, by its path in the core
 * @param {Described} widget - The widget
 * @returns {string} The specifier
 */
function coreModule(widget) {
  return `@pterror/interact-core/${widget.module.replace(/^.*\/(?<name>[\w-]+)\.js$/u, '$<name>')}`
}

/**
 * The description of a widget as a literal, its widget named `widget`
 * @param {Described} widget - The widget
 * @param {string} widgetExpression - The widget, as written
 * @param {string} inside - The descriptions inside, as written
 * @returns {string} The literal
 */
function descriptionLiteral(widget, widgetExpression, inside) {
  return `{ events: ${JSON.stringify(widget.events)}, inside: ${inside}, props: ${JSON.stringify(widget.props)}, value: ${
    widget.value === null ? 'null' : JSON.stringify(widget.value)
  }, ${widgetExpression === 'widget' ? 'widget' : `widget: ${widgetExpression}`} }`
}

/**
 * The union of a widget's own part names, as a type
 * @param {Described} widget - The widget
 * @returns {string} The union
 */
function partUnion(widget) {
  return widget.parts.map((part) => `'${part.name}'`).join(' | ') || 'never'
}

/**
 * The type of a widget's events, from its effects' types
 * @param {Described} widget - The widget
 * @returns {string} The union of its event effects
 */
function eventType(widget) {
  return widget.events.length === 0
    ? 'never'
    : `Extract<EffectOf<Widget>, Readonly<{ type: ${widget.events.map((event) => `'${event}'`).join(' | ')} }>>`
}

/**
 * The type of a widget's bound value
 * @param {Described} widget - The widget
 * @returns {string} Its type
 */
function valueType(widget) {
  const { value } = widget
  if (value === null) {
    return 'never'
  }
  return value.wrapped ? `NonNullable<WidgetProps['${value.prop}']>['value']` : `WidgetProps['${value.prop}']`
}

/**
 * The JSDoc lines of a description
 * @param {string} doc - The description
 * @returns {string} The lines, each starting ` * `
 */
function docLines(doc) {
  /** @type {string[]} */
  const lines = []
  let line = ''
  for (const word of doc.split(/\s+/u).filter((one) => one !== '')) {
    if (line.length + word.length + 1 > 110) {
      lines.push(line)
      line = word
    } else {
      line = line === '' ? word : `${line} ${word}`
    }
  }
  if (line !== '') {
    lines.push(line)
  }
  return lines.map((one) => ` * ${one}`).join('\n')
}

/**
 * The factory's parameters that are widgets it takes inside, with the prop each is given by
 * @param {Described} widget - The factory
 * @returns {Readonly<{ name: string, doc: string, inside: string }>[]} The parameters
 */
function insideParams(widget) {
  return (widget.factory ?? []).flatMap((param) => (param.inside === null ? [] : [{ ...param, inside: param.inside }]))
}

/**
 * The file a widget's module is in, by its name
 * @param {string} name - The widget's name
 * @returns {string} The name in kebab case
 */
function fileName(name) {
  return name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * A module for a framework whose glue makes components with `component(description, name)` and types them as
 * `Component<Own, Parts>`: React's, Vue's and Solid's
 * @param {Described} widget - The widget
 * @param {string} header - The generated files' header
 * @param {string} glue - The module of the glue, from the widget's module
 * @param {boolean} named - Whether the glue takes the component's name
 * @returns {string} The module
 */
function componentModule(widget, header, glue, named) {
  const name = capital(widget.name)
  const factory = widget.factory !== null
  const glueTypes = factory ? 'AnyComponent, Component, Own, OwnOf, PartsInside' : 'Component, Own'
  const coreTypes = widget.events.length > 0 ? 'EffectOf, PropsOf' : 'PropsOf'
  const types = [
    `/** @import { ${glueTypes} } from '${glue}' */`,
    `/** @import { ${coreTypes} } from '@pterror/interact-core' */`,
  ].join('\n')
  if (widget.factory === null) {
    return `${header}
import { ${widget.name} as widget } from '${coreModule(widget)}'

import { component } from '${glue}'

${types}

/** @typedef {typeof widget} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

/** @typedef {${partUnion(widget)}} ${name}Parts */
/** @typedef {Own<WidgetProps, ${widget.value === null ? 'never' : `'${widget.value.prop}'`}, ${valueType(widget)}, ${eventType(widget)}, unknown>} ${name}Props */

/**
${docLines(widget.doc)}
 * @type {Component<${name}Props, ${name}Parts>}
 */
const ${name} = component(${descriptionLiteral(widget, 'widget', '{}')}${named ? `, '${name}'` : ''})

export { ${name} }
`
  }
  const factoryParams = widget.factory
  const inside = insideParams(widget)
  const generics = inside.map((param) => ` * @template {AnyComponent} ${capital(param.name)}`).join('\n')
  const params = factoryParams
    .map((param) =>
      param.inside === null
        ? ` * @param {Parameters<typeof widget>[${String(factoryParams.indexOf(param))}]} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`
        : ` * @param {${capital(param.name)}} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`,
    )
    .join('\n')
  const insideProps = `Readonly<{ ${inside.map((param) => `${param.inside}: OwnOf<${capital(param.name)}>`).join(', ')} }>`
  const parts = [
    partUnion(widget),
    ...inside.map((param) => `PartsInside<${capital(param.name)}, '${param.inside}'>`),
  ].join(' | ')
  const args = factoryParams
    .map((param) => (param.inside === null ? param.name : `${param.name}.description.widget`))
    .join(', ')
  const insideLiteral = `{ ${inside.map((param) => `${param.inside}: ${param.name}.description`).join(', ')} }`
  return `${header}
import { ${widget.name} as widget } from '${coreModule(widget)}'

import { component } from '${glue}'

${types}

/** @typedef {ReturnType<typeof widget>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

/**
${docLines(widget.doc)}
${generics}
${params}
 * @returns {Component<Own<WidgetProps, ${widget.value === null ? 'never' : `'${widget.value.prop}'`}, ${valueType(widget)}, ${eventType(widget)}, ${insideProps}>, ${parts}>}
 *   The component
 */
function ${widget.name}(${factoryParams.map((param) => param.name).join(', ')}) {
  return component(${descriptionLiteral(widget, `widget(${args})`, insideLiteral)}${named ? `, '${name}'` : ''})
}

export { ${widget.name} }
`
}

/**
 * The index of a framework's package: its glue and every widget's component
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The header
 * @param {string} glue - What the index exports from the glue
 * @returns {string} The index
 */
function componentIndex(widgets, header, glue) {
  const lines = widgets.map(
    (widget) =>
      `export { ${widget.factory === null ? capital(widget.name) : widget.name} } from './widgets/${fileName(widget.name)}.js'`,
  )
  return `${header}
${glue}
${lines.join('\n')}
`
}

/**
 * React's components
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function react(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    files.set(`widgets/${fileName(widget.name)}.js`, componentModule(widget, header, '../interact.js', true))
  }
  files.set(
    'index.js',
    componentIndex(
      widgets,
      header,
      `export { component } from './interact.js'\n\n/** @typedef {import('./interact.js').Change} Change */\n/** @typedef {import('./interact.js').PartProps} PartProps */`,
    ),
  )
  return files
}

/**
 * A Vue component's module: the component made by `defineComponent` from the glue's setup, so Vue's tools type it
 * by its props, events and slots
 * @param {Described} widget - The widget
 * @param {string} header - The generated files' header
 * @returns {string} The module
 */
function vueModule(widget, header) {
  const name = capital(widget.name)
  const bound = widget.value === null ? 'never' : `'${widget.value.prop}'`
  const coreTypes = widget.events.length > 0 ? 'EffectOf, PropsOf' : 'PropsOf'
  const typing = `${valueType(widget)}, ${eventType(widget)}`
  const factory = widget.factory ?? []
  const inside = insideParams(widget)
  const own = `Own<WidgetProps, ${bound}, ${typing}, ${
    inside.length === 0
      ? 'unknown'
      : `Readonly<{ ${inside.map((param) => `${param.inside}: OwnOf<${capital(param.name)}>`).join(', ')} }>`
  }>`
  const parts = [
    partUnion(widget),
    ...inside.map((param) => `PartsInside<${capital(param.name)}, '${param.inside}'>`),
  ].join(' | ')
  const args = factory
    .map((param) => (param.inside === null ? param.name : `${param.name}.description.widget`))
    .join(', ')
  const insideLiteral = `{ ${inside.map((param) => `${param.inside}: ${param.name}.description`).join(', ')} }`
  const made = (/** @type {string} */ indent, /** @type {string} */ widgetExpression) =>
    [
      `const description = ${descriptionLiteral(widget, widgetExpression, inside.length === 0 ? '{}' : insideLiteral)}`,
      '/**',
      ' * The setup',
      ` * @param {${own} & Given} props - The props`,
      ` * @param {SetupContext<Emits<${bound}, ${typing}>, SlotsType<Slots<${inside.length === 0 ? parts : 'string'}>>>} context - The slots and emit`,
      ' * @returns {() => VNodeChild} The render function',
      ' */',
      'const setup = (props, context) => run(description, props, context)',
      `/** @type {() => Readonly<{ own: ${own}, parts: ${parts} }> | undefined} */`,
      'const types = typesOf',
    ]
      .map((line) => `${indent}${line}`)
      .join('\n')
  const imports = `import { ${widget.name} as widget } from '${coreModule(widget)}'
import { defineComponent } from 'vue'

import { optionsOf, run, typesOf } from '../interact.js'

/** @import { ${inside.length === 0 ? '' : 'AnyComponent, '}Emits, Given, Own${inside.length === 0 ? '' : ', OwnOf, PartsInside'}, Slots } from '../interact.js' */
/** @import { ${coreTypes} } from '@pterror/interact-core' */
/** @import { SetupContext, SlotsType, VNodeChild } from 'vue' */`
  if (widget.factory === null) {
    return `${header}
${imports}

/** @typedef {typeof widget} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

${made('', 'widget')}

/**
${docLines(widget.doc)}
 */
const ${name} = Object.assign(defineComponent(setup, optionsOf(description, '${name}')), { description, types: types() })

export { ${name} }
`
  }
  const generics = inside.map((param) => ` * @template {AnyComponent} ${capital(param.name)}`).join('\n')
  const params = factory
    .map((param) =>
      param.inside === null
        ? ` * @param {Parameters<typeof widget>[${String(factory.indexOf(param))}]} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`
        : ` * @param {${capital(param.name)}} ${param.name} - ${param.doc.replaceAll('\n', ' ')}`,
    )
    .join('\n')
  return `${header}
${imports}

/** @typedef {ReturnType<typeof widget>} Widget */
/** @typedef {PropsOf<Widget>} WidgetProps */

/**
${docLines(widget.doc)}
${generics}
${params}
 * @returns The component
 */
function ${widget.name}(${factory.map((param) => param.name).join(', ')}) {
${made('  ', `widget(${args})`)}
  return Object.assign(defineComponent(setup, optionsOf(description, '${name}')), { description, types: types() })
}

export { ${widget.name} }
`
}

/**
 * Solid's components, beside the package's own modules
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function solid(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    files.set(`widgets/${fileName(widget.name)}.js`, componentModule(widget, header, '../component.js', false))
  }
  files.set('widgets/index.js', componentIndex(widgets, header, '').replaceAll("'./widgets/", "'./"))
  return files
}

/**
 * Vue's components
 * @param {readonly Described[]} widgets - The widgets
 * @param {string} header - The generated files' header
 * @returns {Files} The files
 */
function vue(widgets, header) {
  /** @type {Map<string, string>} */
  const files = new Map()
  for (const widget of widgets) {
    files.set(`widgets/${fileName(widget.name)}.js`, vueModule(widget, header))
  }
  files.set(
    'index.js',
    componentIndex(
      widgets,
      header,
      `export { optionsOf, run, typesOf } from './interact.js'\n\n/** @typedef {import('./interact.js').Change} Change */\n/** @typedef {import('./interact.js').PartSlot} PartSlot */`,
    ),
  )
  return files
}

export {
  solid,
  vue,
  capital,
  componentIndex,
  componentModule,
  coreModule,
  descriptionLiteral,
  docLines,
  fileName,
  insideParams,
  react,
}
