import { defineSchema } from 'keybinds-source/schema.js'
import { BindingsStore, fromBindings } from 'keybinds-source/store.js'

const schema = defineSchema({
  open: { keys: ['$mod+o'], label: 'Open' },
  save: { keys: ['$mod+s'], label: 'Save' },
})
const store = new BindingsStore(schema, 'type-errors')

const known = store.get('save').keys
const typo = store.get('sav')
const handlerTypo = fromBindings(store, { sav: () => 'saved' })
const schemaTypo = fromBindings(schema, { opne: () => 'opened' })

export { handlerTypo, known, schemaTypo, typo }
