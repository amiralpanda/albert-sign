import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const UPLOADS_PATH = join(process.cwd(), 'data', 'atome-uploads.json')

export interface AtomeUploadEntry {
  atomeFileId: string
  sourceType: 'presentation' | 'document'
  sourceId: string
  clientSlug: string
  filename: string
  sizeBytes: number
  uploadedAt: string
  status: 'created' | 'deleted'
  deletedAt: string | null
}

export function getUploads(): AtomeUploadEntry[] {
  if (!existsSync(UPLOADS_PATH)) return []
  return JSON.parse(readFileSync(UPLOADS_PATH, 'utf-8'))
}

function saveUploads(entries: AtomeUploadEntry[]): void {
  writeFileSync(UPLOADS_PATH, JSON.stringify(entries, null, 2), 'utf-8')
}

export function logUpload(entry: Omit<AtomeUploadEntry, 'status' | 'deletedAt'>): void {
  const entries = getUploads()
  entries.push({ ...entry, status: 'created', deletedAt: null })
  saveUploads(entries)
}

export function markDeleted(atomeFileId: string): void {
  const entries = getUploads()
  for (const entry of entries) {
    if (entry.atomeFileId === atomeFileId && entry.status === 'created') {
      entry.status = 'deleted'
      entry.deletedAt = new Date().toISOString()
    }
  }
  saveUploads(entries)
}

export function getActiveUploadForSource(
  sourceType: 'presentation' | 'document',
  sourceId: string
): AtomeUploadEntry | null {
  const entries = getUploads()
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]
    if (e.sourceType === sourceType && e.sourceId === sourceId && e.status === 'created') {
      return e
    }
  }
  return null
}
