const CURSIVE_FONT = '"Dancing Script", cursive'

export async function ensureSignatureFont(): Promise<void> {
  try {
    await document.fonts.load(`400 48px ${CURSIVE_FONT}`)
  } catch {
    /* fallback system cursive */
  }
}

export function renderTypedSignatureImage(
  text: string,
  width = 560,
  height = 112,
): string {
  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const display = text.trim()
  let fontSize = 48
  ctx.fillStyle = '#18181b'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = width - 40
  do {
    ctx.font = `400 ${fontSize}px ${CURSIVE_FONT}`
    fontSize -= 2
  } while (fontSize > 24 && ctx.measureText(display).width > maxWidth)

  ctx.fillText(display, width / 2, height / 2)
  return canvas.toDataURL('image/png')
}

export function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx || canvas.width === 0 || canvas.height === 0) return true
  const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < sample.length; i += 4) {
    if (sample[i] !== 0) return false
  }
  return true
}
