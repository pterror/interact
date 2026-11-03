import { describe, expect, test } from 'bun:test'

import { tokens } from './tokens.js'

describe('tokens', () => {
  test('splits markup into comments, tags, text and raw text', () => {
    expect(tokens('<p a="<b>">x<!-- <i> --></p><style>a<b</style>').map(({ kind, text }) => `${kind}:${text}`)).toEqual(
      ['start:<p a="<b>">', 'text:x', 'comment:<!-- <i> -->', 'end:</p>', 'start:<style>', 'raw:a<b', 'end:</style>'],
    )
  })

  test('ends raw text at its own end tag, whatever it holds', () => {
    expect(tokens('<script><!-- </script><p>').map(({ kind }) => kind)).toEqual(['start', 'raw', 'end', 'start'])
  })
})
