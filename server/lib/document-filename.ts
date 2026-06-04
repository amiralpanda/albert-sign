export function documentPdfFilename(title: string): string {
  return `${title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_')}.pdf`
}
