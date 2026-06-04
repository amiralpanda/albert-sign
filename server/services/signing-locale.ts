import * as store from './file-store.js'

export type SigningLocale = 'fr' | 'en'

/** Email + date locale from document template (meta.locale or `-en` suffix). */
export function resolveSigningLocale(templateName: string): SigningLocale {
  const template = store.getDocumentTemplate(templateName)
  const meta = template?.meta as store.DocumentTemplateMeta & { locale?: string }
  const raw = meta?.locale?.trim().toLowerCase()
  if (raw === 'en' || raw === 'english') return 'en'
  if (raw === 'fr' || raw === 'french' || raw === 'français') return 'fr'
  if (templateName.endsWith('-en') || templateName.includes('-en-')) return 'en'
  return 'fr'
}

export function formatSigningDate(isoOrDate: string | Date, locale: SigningLocale): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
