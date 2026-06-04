import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

const CHROME_PATH = join(
  homedir(),
  '.cache/puppeteer/chrome/mac_arm-146.0.7680.76/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)

export async function launchBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })
  }

  const puppeteer = await import('puppeteer-core')
  const opts: Record<string, unknown> = { headless: true }
  if (existsSync(CHROME_PATH)) {
    opts.executablePath = CHROME_PATH
  }
  return puppeteer.default.launch(opts)
}
