import { createHash } from 'crypto'
import Handlebars from 'handlebars'
import { getDocumentTemplate } from './document-templates.js'

export function renderDocumentHtml(
  templateName: string,
  variables: Record<string, string>,
): string | null {
  const result = getDocumentTemplate(templateName)
  if (!result) return null
  const compiled = Handlebars.compile(result.template)
  return compiled(variables)
}

export function hashDocumentContent(html: string): string {
  return createHash('sha256').update(html, 'utf8').digest('hex')
}

export function hashDocument(
  templateName: string,
  variables: Record<string, string>,
): string | null {
  const html = renderDocumentHtml(templateName, variables)
  if (!html) return null
  return hashDocumentContent(html)
}
