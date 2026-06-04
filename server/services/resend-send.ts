export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export function getResendFromAddress(): string {
  return (
    process.env.RESEND_FROM ||
    process.env.SIGNING_FROM ||
    'Jérémy Foucray <jeremy@atome.sh>'
  )
}

function parseRecipients(value?: string): string[] | undefined {
  if (!value?.trim()) return undefined
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

export interface ResendSendOptions {
  to: string
  subject: string
  html: string
  cc?: string
  attachments?: { filename: string; content: Buffer }[]
}

export async function sendViaResend(
  options: ResendSendOptions,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not set' }
  }

  const body: Record<string, unknown> = {
    from: getResendFromAddress(),
    to: [options.to],
    subject: options.subject,
    html: options.html,
  }

  const cc = parseRecipients(options.cc)
  if (cc?.length) body.cc = cc

  if (options.attachments?.length) {
    body.attachments = options.attachments.map(a => ({
      filename: a.filename,
      content: a.content.toString('base64'),
    }))
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await res.json().catch(() => ({}))) as { message?: string; id?: string }

    if (!res.ok) {
      return {
        sent: false,
        error: data.message || `Resend HTTP ${res.status}`,
      }
    }

    return { sent: true }
  } catch (err) {
    return { sent: false, error: String(err) }
  }
}
