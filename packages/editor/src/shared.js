/**
 * Where two texts differ: the length they share at the start, and at the end, in UTF-16 code units as positions in
 * a text are
 * @param {string} was - One
 * @param {string} now - The other
 * @returns {Readonly<{ start: number, end: number }>} The shared lengths, never overlapping in either text
 */
function shared(was, now) {
  const most = Math.min(was.length, now.length)
  let start = 0
  while (start < most && was[start] === now[start]) {
    start += 1
  }
  let end = 0
  while (end < most - start && was[was.length - 1 - end] === now[now.length - 1 - end]) {
    end += 1
  }
  return { end, start }
}

export { shared }
