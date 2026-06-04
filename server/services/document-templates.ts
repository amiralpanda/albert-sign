import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '..', '..', 'methodology', 'templates', 'documents')

export interface DocumentTemplateMeta {
  name: string
  locale?: string
  documentType?: string
  requiresSignature?: boolean
}

export function getDocumentTemplate(
  name: string,
): { meta: DocumentTemplateMeta; template: string } | null {
  const metaPath = join(TEMPLATES_DIR, name, 'meta.yaml')
  const templatePath = join(TEMPLATES_DIR, name, 'template.hbs')
  if (!existsSync(metaPath) || !existsSync(templatePath)) return null
  const meta = YAML.parse(readFileSync(metaPath, 'utf-8')) as DocumentTemplateMeta
  const template = readFileSync(templatePath, 'utf-8')
  return { meta, template }
}
