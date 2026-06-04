import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')
const PYTHON_SCRIPT = join(WORKSPACE_ROOT, 'config', 'credentials', 'gmail-send-message.py')
const PYTHON_VENV = join(WORKSPACE_ROOT, 'config', 'credentials', '.venv', 'bin', 'python3')

export function gmailCredentialsAvailable(): boolean {
  return (
    existsSync(PYTHON_SCRIPT) &&
    existsSync(join(WORKSPACE_ROOT, 'config', 'credentials', 'google-token.json'))
  )
}

export interface GmailSendOptions {
  to: string
  subject: string
  html: string
  from?: string
  cc?: string
  attachments?: { filename: string; content: Buffer }[]
}

export async function sendViaGmailApi(
  options: GmailSendOptions,
): Promise<{ sent: boolean; error?: string }> {
  const tempPaths: string[] = []
  try {
    const attachments = options.attachments?.map(att => {
      const path = join(tmpdir(), `albert-mail-${Date.now()}-${att.filename}`)
      writeFileSync(path, att.content)
      tempPaths.push(path)
      return { filename: att.filename, path }
    })

    const payload = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      from: options.from,
      cc: options.cc,
      attachments,
    }

    const result = await runPython(payload)
    return result
  } catch (err) {
    return { sent: false, error: String(err) }
  } finally {
    for (const p of tempPaths) {
      try {
        unlinkSync(p)
      } catch {
        /* ignore */
      }
    }
  }
}

function runPython(payload: Record<string, unknown>): Promise<{ sent: boolean; error?: string }> {
  return new Promise((resolve) => {
    const python = PYTHON_VENV
    const proc = spawn(python, [PYTHON_SCRIPT], {
      cwd: WORKSPACE_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (c: Buffer) => {
      stdout += c.toString()
    })
    proc.stderr.on('data', (c: Buffer) => {
      stderr += c.toString()
    })
    proc.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim() || '{}') as { sent?: boolean; error?: string }
        if (parsed.sent) {
          resolve({ sent: true })
          return
        }
        resolve({
          sent: false,
          error: parsed.error || stderr.trim() || `gmail-send exited ${code}`,
        })
      } catch {
        resolve({ sent: false, error: stderr.trim() || stdout.trim() || `exit ${code}` })
      }
    })
    proc.on('error', (err) => resolve({ sent: false, error: String(err) }))
    proc.stdin.write(JSON.stringify(payload))
    proc.stdin.end()
  })
}
