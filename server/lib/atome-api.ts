/**
 * Shared Atome API client primitives.
 * Used by: @albert/api, @albert/mcp, @albert/scripts
 *
 * Two modes:
 * - No apiKey: uses the global ATOME_API_KEY env var (Atome's internal workspace)
 * - With apiKey: targets a specific client workspace
 */

const DEFAULT_URL = 'https://api.atome.sh'

export function getAtomeBaseUrl(): string {
  return process.env.ATOME_API_URL || DEFAULT_URL
}

export function getAtomeInternalKey(): string {
  return process.env.ATOME_API_KEY || ''
}

export function resolveAtomeKey(apiKey?: string): string {
  const key = apiKey || getAtomeInternalKey()
  if (!key) {
    throw new Error('ATOME_API_KEY is not set. Add it to .env at the workspace root.')
  }
  return key
}

export async function atomePost<T = unknown>(
  endpoint: string,
  body: Record<string, unknown> = {},
  apiKey?: string,
): Promise<T> {
  const key = resolveAtomeKey(apiKey)
  const url = getAtomeBaseUrl()

  const res = await fetch(`${url}/${endpoint}`, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!text) return {} as T

  const data = JSON.parse(text)
  if (data._tag === 'SessionError' && data.message?.includes('Rate limit')) {
    throw new Error(`Atome rate limit exceeded on ${endpoint}. Wait and retry.`)
  }
  if (data._tag === 'SessionError') {
    throw new Error(`Atome session error on ${endpoint}: ${data.message}`)
  }
  if (data._tag === 'HttpApiDecodeError') {
    throw new Error(`Atome API error on ${endpoint}: ${data.message}`)
  }
  if (data._tag === 'FieldSlugAlreadyExistsError') {
    const err = new Error(`FieldSlugAlreadyExistsError: ${data.id}`) as Error & { fieldId: string }
    err.fieldId = data.id
    throw err
  }
  if (data._tag === 'DatabaseError') {
    throw new Error(`Atome database error on ${endpoint}: ${JSON.stringify(data.e || data)}`)
  }
  return data as T
}

export async function atomePut<T = unknown>(
  endpoint: string,
  body: Record<string, unknown> = {},
  apiKey?: string,
): Promise<T> {
  const key = resolveAtomeKey(apiKey)
  const url = getAtomeBaseUrl()

  const res = await fetch(`${url}/${endpoint}`, {
    method: 'PUT',
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!text) return {} as T

  const data = JSON.parse(text)
  if (data._tag === 'HttpApiDecodeError' || data._tag === 'EntityUpdateError') {
    throw new Error(`Atome PUT error on ${endpoint}: ${data.message || JSON.stringify(data)}`)
  }
  return data as T
}

export async function atomeDelete(
  endpoint: string,
  apiKey?: string,
): Promise<boolean> {
  const key = resolveAtomeKey(apiKey)
  const url = getAtomeBaseUrl()

  const res = await fetch(`${url}/${endpoint}`, {
    method: 'DELETE',
    headers: { 'x-api-key': key },
  })

  return res.ok
}
