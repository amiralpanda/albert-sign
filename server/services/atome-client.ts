/**
 * Atome API Client
 *
 * High-level Atome operations (contacts, companies, files, etc.).
 * Core primitives (atomePost, resolveKey) live in ./lib/atome-api.js.
 *
 * Two usage modes:
 * - Internal (no apiKey param): uses ATOME_API_KEY from .env (Atome's own workspace)
 * - Client workspace (apiKey param): targets a specific client workspace
 */

import { getClientBySlug } from './file-store.js'
import {
  atomePost,
  resolveAtomeKey,
  getAtomeBaseUrl,
} from './lib/atome-api.js'

export { atomePost }

/**
 * Load the Atome API key for a client's workspace.
 * Throws if the client has no key configured (no silent fallback to internal key).
 */
export function getClientAtomeKey(slug: string): string {
  const client = getClientBySlug(slug)
  if (!client) throw new Error(`Client not found: ${slug}`)
  if (!client.atomeApiKey) {
    throw new Error(`No Atome API key configured for client "${slug}". Set it in the admin UI.`)
  }
  return client.atomeApiKey
}

// ========== TYPES ==========

export interface AtomeContact {
  id: string
  first_name: string | null
  last_name: string | null
  name: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  company_id: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface AtomeCompany {
  id: string
  name: string
  website_url: string | null
  linkedin_url: string | null
  country_code: string | null
  headquarters_city: string | null
  employee_count: number | null
  revenue_estimate_usd_millions: number | null
  founded_year: number | null
  image_url: string | null
  description: string | null
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AtomeNote {
  id: string
  title: string
  content_text: string | null
  content_json: unknown | null
  created_at: string
  updated_at: string
}

export interface AtomeFile {
  id: string
  filename: string
  original_filename: string
  mime_type: string
  size_bytes: number
  file_type: string
  s3_url: string
  created_at: string
}

export interface UploadUrlResponse {
  uploadUrl: string
  s3Key: string
  expiresAt: string
}

// ========== CONTACTS ==========

export async function searchContacts(query?: string, limit = 25, apiKey?: string): Promise<AtomeContact[]> {
  const body: Record<string, unknown> = { limit }
  if (query) body.search = query
  const data = await atomePost<{ contacts: AtomeContact[] }>('contacts/get-contacts', body, apiKey)
  return data.contacts || []
}

export async function getContactById(id: string, apiKey?: string): Promise<AtomeContact | null> {
  const data = await atomePost<{ contact: AtomeContact }>('contacts/get-contact', { id }, apiKey)
  return data.contact || null
}

// ========== COMPANIES ==========

export async function searchCompanies(query?: string, limit = 50, apiKey?: string): Promise<AtomeCompany[]> {
  const body: Record<string, unknown> = { limit }
  if (query) body.search = query
  const data = await atomePost<{ companies: AtomeCompany[] }>('companies/get-companies', body, apiKey)
  return data.companies || []
}

export async function getCompanyById(id: string, apiKey?: string): Promise<AtomeCompany | null> {
  const data = await atomePost<{ company: AtomeCompany }>('companies/get-company', { id }, apiKey)
  return data.company || null
}

// ========== NOTES ==========

export async function getNotes(limit = 25, apiKey?: string): Promise<AtomeNote[]> {
  const data = await atomePost<{ notes: AtomeNote[] }>('notes/get-notes', { limit }, apiKey)
  return data.notes || []
}

export async function createNote(title: string, contentText?: string, apiKey?: string): Promise<AtomeNote | null> {
  const data = await atomePost<{ note: AtomeNote }>('notes/create-note', {
    title,
    content_text: contentText,
  }, apiKey)
  return data.note || null
}

// ========== FILES ==========

export async function getFiles(limit = 25, apiKey?: string): Promise<AtomeFile[]> {
  const data = await atomePost<{ files: AtomeFile[] }>('files/get-files', { limit }, apiKey)
  return data.files || []
}

/**
 * Upload a file to Atome via multipart upload (curl).
 * Node.js native Blob/FormData doesn't produce the correct multipart format
 * for the Atome API, so we shell out to curl which works reliably.
 */
export async function uploadFile(
  filename: string,
  mimeType: string,
  buffer: Buffer,
  options?: { isOrganizationAccessible?: boolean },
  apiKey?: string,
): Promise<AtomeFile> {
  const key = resolveAtomeKey(apiKey)
  const url = getAtomeBaseUrl()

  const { writeFileSync, unlinkSync } = await import('fs')
  const { execSync } = await import('child_process')
  const { join } = await import('path')
  const { tmpdir } = await import('os')

  const tmpPath = join(tmpdir(), `atome-upload-${Date.now()}-${filename}`)
  writeFileSync(tmpPath, buffer)

  try {
    const params = new URLSearchParams({
      filename,
      mimeType,
      shouldUsePublicStorage: 'false',
      originType: 'atome',
    })

    const result = execSync(
      `curl -s -X POST "${url}/files/upload?${params}" ` +
      `-H "x-api-key: ${key}" ` +
      `-F "file=@${tmpPath};type=${mimeType}"`,
      { encoding: 'utf-8', timeout: 120000 }
    )

    const data = JSON.parse(result)
    if (!data.file) throw new Error(`Atome upload response missing file: ${result.substring(0, 200)}`)
    const file = data.file as AtomeFile

    if (options?.isOrganizationAccessible && file?.id) {
      await atomePost('files/update-file', {
        id: file.id,
        is_organization_accessible: true,
      }, apiKey).catch(() => {})
    }

    return file
  } finally {
    try { unlinkSync(tmpPath) } catch {}
  }
}

// ========== FILE DELETE ==========

export async function deleteFile(fileId: string, apiKey?: string): Promise<boolean> {
  const key = resolveAtomeKey(apiKey)
  const url = getAtomeBaseUrl()

  const res = await fetch(`${url}/files/${fileId}`, {
    method: 'DELETE',
    headers: { 'x-api-key': key },
  })

  return res.ok
}

// ========== HEALTH CHECK ==========

export async function checkConnection(apiKey?: string): Promise<{ connected: boolean; companiesCount?: number; error?: string }> {
  try {
    const companies = await searchCompanies(undefined, 1, apiKey)
    return { connected: true, companiesCount: companies.length >= 0 ? companies.length : 0 }
  } catch (error) {
    return { connected: false, error: String(error) }
  }
}
