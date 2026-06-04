import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { signingRouter } from './routes/signing.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

/** Express app for public contract signing (Vercel + local) */
export function createSigningApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/signing', signingRouter)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'signing', timestamp: new Date().toISOString() })
  })
  return app
}
