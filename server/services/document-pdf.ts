import Handlebars from 'handlebars'
import { getDocumentTemplate } from './document-templates.js'
import { launchBrowser } from './browser.js'

export interface PdfDocumentInput {
  templateName: string
  title: string
  variables: Record<string, string>
}

export async function generateDocumentPdfBuffer(doc: PdfDocumentInput): Promise<Buffer> {
  const result = getDocumentTemplate(doc.templateName)
  if (!result) throw new Error(`Template not found: ${doc.templateName}`)

  const compiled = Handlebars.compile(result.template)
  const html = compiled(doc.variables)

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '0', right: '0' },
      printBackground: true,
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

export function documentPdfFilename(title: string): string {
  return `${title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_')}.pdf`
}
