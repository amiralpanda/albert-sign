import { getDocumentTemplate } from './document-templates.js'

export type SigningLocale = 'fr' | 'en'

export function resolveSigningLocale(templateName: string): SigningLocale {
  const template = getDocumentTemplate(templateName)
  const raw = template?.meta?.locale?.trim().toLowerCase()
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
