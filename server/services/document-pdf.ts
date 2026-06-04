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
    await page.setContent(html, { waitUntil: 'load' })
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

export { documentPdfFilename } from '../lib/document-filename.js'
