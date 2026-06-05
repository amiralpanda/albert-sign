/** RFC 2047 encoded-word for non-ASCII header values */
export function encodeHeaderValue(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

/** Format "Display Name <email@domain>" with encoded display name when needed */
export function formatMailboxHeader(from: string): string {
  const trimmed = from.trim()
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/)
  if (!match) return encodeHeaderValue(trimmed)

  let name = match[1].trim()
  if (
    (name.startsWith('"') && name.endsWith('"')) ||
    (name.startsWith("'") && name.endsWith("'"))
  ) {
    name = name.slice(1, -1)
  }

  const email = match[2].trim()
  return `${encodeHeaderValue(name)} <${email}>`
}
