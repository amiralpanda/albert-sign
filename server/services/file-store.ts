/**
 * FileStore - Service de stockage basé sur les fichiers JSON/YAML
 * 
 * Remplace SQLite pour permettre une gestion code-first des données.
 * Les données de chaque client sont stockées dans son dossier.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import YAML from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKSPACE_ROOT = join(__dirname, '..', '..')
const CLIENTS_DIR = join(WORKSPACE_ROOT, 'clients')

// ========== TYPES ==========

export interface Client {
  id: string
  name: string
  slug: string
  industry?: string
  size?: number
  sizeRange?: string
  country?: string
  website?: string
  linkedinUrl?: string
  atomeApiKey?: string
  createdAt: string
  updatedAt: string
}

export interface PersonReference {
  personId?: string
  name: string
  role?: string
  department?: string
  isMainSpeaker?: boolean
}

export interface Transcript {
  id: string
  clientId: string
  filename: string
  displayName?: string
  department?: string
  speakerName?: string
  speakerRole?: string
  participants?: PersonReference[]
  date?: string
  content: string
  createdAt: string
}

export interface Insight {
  id: string
  clientId: string
  transcriptId: string // Required
  transcriptFilename?: string
  type?: 'problem' | 'recommendation'  // Type d'insight
  speakerName?: string
  speakerRole?: string
  speakerPersonId?: string
  mentionedPersons?: PersonReference[]
  department: string
  tool?: string
  quote?: string
  problemSummary?: string              // Pour type=problem
  summary?: string                     // Pour type=recommendation
  timeLostMinutes?: number
  painType?: string
  severity: number
  relatedProblemId?: string            // Pour type=recommendation - lien vers le problème
  effort?: 'low' | 'medium' | 'high'   // Pour type=recommendation
  impact?: 'low' | 'medium' | 'high'   // Pour type=recommendation
  rating?: 0 | 1 | 2 | 3               // 0=ignorer, 1=utilisable, 2=important, 3=critique
  tags?: string[]
  createdAt: string
}

export interface Presentation {
  id: string
  token: string
  clientId: string
  title: string
  type: string
  slides: unknown[]
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

export interface StrategyTask {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  estimatedTime?: string
}

export interface Initiative {
  id: string
  title: string
  description: string
  readiness: 'applicable' | 'needs_testing' | 'needs_discovery' | 'change_management'
  priority: 'P0' | 'P1' | 'P2'
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  estimatedDuration?: string
  relatedProblemIds: string[]
  relatedRecommendationIds: string[]
  tasks: StrategyTask[]
  status: 'planned' | 'in_progress' | 'testing' | 'completed' | 'blocked'
  notes?: string
}

export interface Strategy {
  id: string
  clientId: string
  title: string
  vision?: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  initiatives: Initiative[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AtomePlan {
  id: string
  clientId: string
  name: string
  description?: string
  plan: unknown
  createdAt: string
  updatedAt: string
}

export interface DocumentDraft {
  id: string
  clientId: string
  templateName: string
  title: string
  variables: Record<string, string>
  status: 'draft' | 'final'
  createdAt: string
  updatedAt: string
}

export interface DocumentTemplateVariable {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'textarea'
  required?: boolean
  placeholder?: string
  source?: string
  default?: string
}

export interface DocumentTemplateSection {
  id: string
  label: string
  variables: DocumentTemplateVariable[]
}

export interface DocumentTemplateMeta {
  name: string
  description: string
  type: string
  documentType?: string
  requiresSignature?: boolean
  sections: DocumentTemplateSection[]
}

const TEMPLATES_DIR = join(WORKSPACE_ROOT, 'methodology', 'templates', 'documents')

// ========== UTILITAIRES FICHIERS ==========

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

function writeJson<T>(filePath: string, data: T): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function readYaml<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  return YAML.parse(content) as T
}

function writeYaml<T>(filePath: string, data: T): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, YAML.stringify(data), 'utf-8')
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ========== CLIENTS ==========

export function getAllClients(): Client[] {
  if (!existsSync(CLIENTS_DIR)) return []
  
  const dirs = readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)

  return dirs
    .map(slug => {
      const configPath = join(CLIENTS_DIR, slug, 'config.yaml')
      return readYaml<Client>(configPath)
    })
    .filter((c): c is Client => c !== null)
}

export function getClientById(id: string): Client | null {
  const clients = getAllClients()
  return clients.find(c => c.id === id) ?? null
}

export function getClientBySlug(slug: string): Client | null {
  const configPath = join(CLIENTS_DIR, slug, 'config.yaml')
  return readYaml<Client>(configPath)
}

export function createClient(data: Omit<Client, 'id' | 'slug' | 'createdAt' | 'updatedAt'>): Client {
  const slug = generateSlug(data.name)
  const clientDir = join(CLIENTS_DIR, slug)
  
  if (existsSync(clientDir)) {
    throw new Error(`Client "${slug}" already exists`)
  }

  // Créer la structure de dossiers
  const folders = [
    clientDir,
    join(clientDir, 'transcripts'),
    join(clientDir, 'insights'),
    join(clientDir, 'presentations'),
    join(clientDir, 'atome-plans'),
    join(clientDir, 'analysis')
  ]
  folders.forEach(dir => ensureDir(dir))

  const now = new Date().toISOString()
  const client: Client = {
    ...data,
    id: uuid(),
    slug,
    createdAt: now,
    updatedAt: now
  }
  
  writeYaml(join(clientDir, 'config.yaml'), client)

  // Créer fichiers vides
  writeJson(join(clientDir, 'transcripts', 'index.json'), [])
  writeJson(join(clientDir, 'insights', 'insights.json'), [])
  writeJson(join(clientDir, 'analysis', 'departments.json'), [])
  writeJson(join(clientDir, 'analysis', 'tools.json'), [])
  writeJson(join(clientDir, 'analysis', 'processes.json'), [])
  writeJson(join(clientDir, 'analysis', 'pain-points.json'), [])

  return client
}

export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const client = getClientById(id)
  if (!client) return null
  
  const clientDir = join(CLIENTS_DIR, client.slug)
  const updated: Client = {
    ...client,
    ...updates,
    id: client.id, // Protéger l'ID
    slug: client.slug, // Protéger le slug
    updatedAt: new Date().toISOString()
  }
  
  writeYaml(join(clientDir, 'config.yaml'), updated)
  return updated
}

export function deleteClient(id: string): boolean {
  const client = getClientById(id)
  if (!client) return false
  
  const clientDir = join(CLIENTS_DIR, client.slug)
  if (existsSync(clientDir)) {
    rmSync(clientDir, { recursive: true })
    return true
  }
  return false
}

// ========== TRANSCRIPTS ==========

export function getTranscriptsByClient(clientId: string): Transcript[] {
  const client = getClientById(clientId)
  if (!client) return []
  
  const indexPath = join(CLIENTS_DIR, client.slug, 'transcripts', 'index.json')
  return readJson<Transcript[]>(indexPath) ?? []
}

export function getTranscriptById(id: string): Transcript | null {
  const clients = getAllClients()
  for (const client of clients) {
    const transcripts = getTranscriptsByClient(client.id)
    const transcript = transcripts.find(t => t.id === id)
    if (transcript) return transcript
  }
  return null
}

export function createTranscript(data: Omit<Transcript, 'id' | 'createdAt'>): Transcript {
  const client = getClientById(data.clientId)
  if (!client) throw new Error(`Client not found: ${data.clientId}`)
  
  const transcripts = getTranscriptsByClient(data.clientId)
  const transcript: Transcript = {
    ...data,
    id: uuid(),
    createdAt: new Date().toISOString()
  }
  
  transcripts.push(transcript)
  writeJson(join(CLIENTS_DIR, client.slug, 'transcripts', 'index.json'), transcripts)
  
  return transcript
}

export function createTranscriptsBulk(items: Omit<Transcript, 'id' | 'createdAt'>[]): Transcript[] {
  return items.map(item => createTranscript(item))
}

export function updateTranscript(id: string, updates: Partial<Transcript>): Transcript | null {
  const clients = getAllClients()
  
  for (const client of clients) {
    const transcripts = getTranscriptsByClient(client.id)
    const index = transcripts.findIndex(t => t.id === id)
    
    if (index !== -1) {
      transcripts[index] = { ...transcripts[index], ...updates, id }
      writeJson(join(CLIENTS_DIR, client.slug, 'transcripts', 'index.json'), transcripts)
      return transcripts[index]
    }
  }
  
  return null
}

export function deleteTranscript(id: string): boolean {
  const clients = getAllClients()
  
  for (const client of clients) {
    const transcripts = getTranscriptsByClient(client.id)
    const filtered = transcripts.filter(t => t.id !== id)
    
    if (filtered.length !== transcripts.length) {
      writeJson(join(CLIENTS_DIR, client.slug, 'transcripts', 'index.json'), filtered)
      return true
    }
  }
  
  return false
}

// ========== INSIGHTS ==========

export function getInsightsByClient(clientId: string): Insight[] {
  const client = getClientById(clientId)
  if (!client) return []
  
  const insightsPath = join(CLIENTS_DIR, client.slug, 'insights', 'insights.json')
  return readJson<Insight[]>(insightsPath) ?? []
}

export function getAllInsights(filters?: { 
  clientId?: string
  department?: string
  minSeverity?: number 
}): Insight[] {
  const clients = getAllClients()
  let allInsights: Insight[] = []
  
  for (const client of clients) {
    if (filters?.clientId && client.id !== filters.clientId) continue
    const insights = getInsightsByClient(client.id)
    allInsights = allInsights.concat(insights)
  }
  
  if (filters?.department) {
    allInsights = allInsights.filter(i => i.department === filters.department)
  }
  if (filters?.minSeverity) {
    allInsights = allInsights.filter(i => i.severity >= filters.minSeverity!)
  }
  
  return allInsights
}

export function getInsightById(id: string): Insight | null {
  const clients = getAllClients()
  for (const client of clients) {
    const insights = getInsightsByClient(client.id)
    const insight = insights.find(i => i.id === id)
    if (insight) return insight
  }
  return null
}

export function createInsight(data: Omit<Insight, 'id' | 'createdAt'>): Insight {
  const client = getClientById(data.clientId)
  if (!client) throw new Error(`Client not found: ${data.clientId}`)
  
  const insights = getInsightsByClient(data.clientId)
  const insight: Insight = {
    ...data,
    id: uuid(),
    createdAt: new Date().toISOString()
  }
  
  insights.push(insight)
  writeJson(join(CLIENTS_DIR, client.slug, 'insights', 'insights.json'), insights)
  
  return insight
}

export function updateInsight(id: string, updates: Partial<Insight>): Insight | null {
  const clients = getAllClients()
  
  for (const client of clients) {
    const insights = getInsightsByClient(client.id)
    const index = insights.findIndex(i => i.id === id)
    
    if (index !== -1) {
      insights[index] = { ...insights[index], ...updates, id }
      writeJson(join(CLIENTS_DIR, client.slug, 'insights', 'insights.json'), insights)
      return insights[index]
    }
  }
  
  return null
}

export function deleteInsight(id: string): boolean {
  const clients = getAllClients()
  
  for (const client of clients) {
    const insights = getInsightsByClient(client.id)
    const filtered = insights.filter(i => i.id !== id)
    
    if (filtered.length !== insights.length) {
      writeJson(join(CLIENTS_DIR, client.slug, 'insights', 'insights.json'), filtered)
      return true
    }
  }
  
  return false
}

export function getInsightsStats(clientId?: string): {
  total: number
  byDepartment: Record<string, number>
  bySeverity: Record<number, number>
  byPainType: Record<string, number>
} {
  const insights = getAllInsights(clientId ? { clientId } : undefined)
  
  const byDepartment: Record<string, number> = {}
  const bySeverity: Record<number, number> = {}
  const byPainType: Record<string, number> = {}
  
  for (const insight of insights) {
    byDepartment[insight.department] = (byDepartment[insight.department] || 0) + 1
    bySeverity[insight.severity] = (bySeverity[insight.severity] || 0) + 1
    if (insight.painType) {
      byPainType[insight.painType] = (byPainType[insight.painType] || 0) + 1
    }
  }
  
  return { total: insights.length, byDepartment, bySeverity, byPainType }
}

// ========== PRESENTATIONS ==========

export function getPresentationsByClient(clientId: string): Presentation[] {
  const client = getClientById(clientId)
  if (!client) return []
  
  const presDir = join(CLIENTS_DIR, client.slug, 'presentations')
  if (!existsSync(presDir)) return []
  
  const files = readdirSync(presDir).filter(f => f.endsWith('.json'))
  return files
    .map(f => readJson<Presentation>(join(presDir, f)))
    .filter((p): p is Presentation => p !== null)
}

export function getPresentationById(id: string): Presentation | null {
  const clients = getAllClients()
  for (const client of clients) {
    const presentations = getPresentationsByClient(client.id)
    const pres = presentations.find(p => p.id === id)
    if (pres) return pres
  }
  return null
}

export function getPresentationByToken(token: string): Presentation | null {
  const clients = getAllClients()
  for (const client of clients) {
    const presentations = getPresentationsByClient(client.id)
    const pres = presentations.find(p => p.token === token)
    if (pres) return pres
  }
  return null
}

export function createPresentation(data: Omit<Presentation, 'id' | 'createdAt' | 'updatedAt'>): Presentation {
  const client = getClientById(data.clientId)
  if (!client) throw new Error(`Client not found: ${data.clientId}`)
  
  const now = new Date().toISOString()
  const presentation: Presentation = {
    ...data,
    id: uuid(),
    createdAt: now,
    updatedAt: now
  }
  
  const presDir = join(CLIENTS_DIR, client.slug, 'presentations')
  ensureDir(presDir)
  writeJson(join(presDir, `${presentation.id}.json`), presentation)
  
  return presentation
}

export function updatePresentation(id: string, updates: Partial<Presentation>): Presentation | null {
  const pres = getPresentationById(id)
  if (!pres) return null
  
  const client = getClientById(pres.clientId)
  if (!client) return null
  
  const updated: Presentation = {
    ...pres,
    ...updates,
    id: pres.id,
    updatedAt: new Date().toISOString()
  }
  
  writeJson(join(CLIENTS_DIR, client.slug, 'presentations', `${id}.json`), updated)
  return updated
}

export function deletePresentation(id: string): boolean {
  const clients = getAllClients()
  
  for (const client of clients) {
    const presDir = join(CLIENTS_DIR, client.slug, 'presentations')
    if (!existsSync(presDir)) continue
    
    const files = readdirSync(presDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const filePath = join(presDir, file)
      const pres = readJson<Presentation>(filePath)
      if (pres && pres.id === id) {
        unlinkSync(filePath)
        return true
      }
    }
  }
  
  return false
}

// ========== STRATEGIES ==========

export function getStrategiesByClient(clientId: string): Strategy[] {
  const client = getClientById(clientId)
  if (!client) return []
  
  const strategiesPath = join(CLIENTS_DIR, client.slug, 'strategy', 'strategies.json')
  return readJson<Strategy[]>(strategiesPath) ?? []
}

export function getStrategyById(id: string): Strategy | null {
  const clients = getAllClients()
  for (const client of clients) {
    const strategies = getStrategiesByClient(client.id)
    const strategy = strategies.find(s => s.id === id)
    if (strategy) return strategy
  }
  return null
}

export function createStrategy(data: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>): Strategy {
  const client = getClientById(data.clientId)
  if (!client) throw new Error(`Client not found: ${data.clientId}`)
  
  const strategies = getStrategiesByClient(data.clientId)
  const now = new Date().toISOString()
  const strategy: Strategy = {
    ...data,
    id: uuid(),
    createdAt: now,
    updatedAt: now
  }
  
  strategies.push(strategy)
  const strategiesPath = join(CLIENTS_DIR, client.slug, 'strategy', 'strategies.json')
  writeJson(strategiesPath, strategies)
  
  return strategy
}

export function updateStrategy(id: string, updates: Partial<Strategy>): Strategy | null {
  const clients = getAllClients()
  
  for (const client of clients) {
    const strategies = getStrategiesByClient(client.id)
    const index = strategies.findIndex(s => s.id === id)
    
    if (index !== -1) {
      strategies[index] = {
        ...strategies[index],
        ...updates,
        id,
        clientId: strategies[index].clientId,
        createdAt: strategies[index].createdAt,
        updatedAt: new Date().toISOString()
      }
      const strategiesPath = join(CLIENTS_DIR, client.slug, 'strategy', 'strategies.json')
      writeJson(strategiesPath, strategies)
      return strategies[index]
    }
  }
  
  return null
}

export function deleteStrategy(id: string): boolean {
  const clients = getAllClients()
  
  for (const client of clients) {
    const strategies = getStrategiesByClient(client.id)
    const filtered = strategies.filter(s => s.id !== id)
    
    if (filtered.length !== strategies.length) {
      const strategiesPath = join(CLIENTS_DIR, client.slug, 'strategy', 'strategies.json')
      writeJson(strategiesPath, filtered)
      return true
    }
  }
  
  return false
}

// ========== ATOME PLANS ==========

export function getAtomePlansByClient(clientId: string): AtomePlan[] {
  const client = getClientById(clientId)
  if (!client) return []
  
  const plansDir = join(CLIENTS_DIR, client.slug, 'atome-plans')
  if (!existsSync(plansDir)) return []
  
  const files = readdirSync(plansDir).filter(f => f.endsWith('.json'))
  return files
    .map(f => readJson<AtomePlan>(join(plansDir, f)))
    .filter((p): p is AtomePlan => p !== null)
}

export function getAtomePlanById(id: string): AtomePlan | null {
  const clients = getAllClients()
  for (const client of clients) {
    const plans = getAtomePlansByClient(client.id)
    const plan = plans.find(p => p.id === id)
    if (plan) return plan
  }
  return null
}

export function createAtomePlan(data: Omit<AtomePlan, 'id' | 'createdAt' | 'updatedAt'>): AtomePlan {
  const client = getClientById(data.clientId)
  if (!client) throw new Error(`Client not found: ${data.clientId}`)
  
  const now = new Date().toISOString()
  const plan: AtomePlan = {
    ...data,
    id: uuid(),
    createdAt: now,
    updatedAt: now
  }
  
  const plansDir = join(CLIENTS_DIR, client.slug, 'atome-plans')
  ensureDir(plansDir)
  writeJson(join(plansDir, `${plan.id}.json`), plan)
  
  return plan
}

export function updateAtomePlan(id: string, updates: Partial<AtomePlan>): AtomePlan | null {
  const plan = getAtomePlanById(id)
  if (!plan) return null
  
  const client = getClientById(plan.clientId)
  if (!client) return null
  
  const updated: AtomePlan = {
    ...plan,
    ...updates,
    id: plan.id,
    updatedAt: new Date().toISOString()
  }
  
  writeJson(join(CLIENTS_DIR, client.slug, 'atome-plans', `${id}.json`), updated)
  return updated
}

export function deleteAtomePlan(id: string): boolean {
  const clients = getAllClients()
  
  for (const client of clients) {
    const plansDir = join(CLIENTS_DIR, client.slug, 'atome-plans')
    if (!existsSync(plansDir)) continue
    
    const files = readdirSync(plansDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const filePath = join(plansDir, file)
      const plan = readJson<AtomePlan>(filePath)
      if (plan && plan.id === id) {
        unlinkSync(filePath)
        return true
      }
    }
  }
  
  return false
}

// ========== DOCUMENT TEMPLATES ==========

export function getDocumentTemplates(): { name: string; meta: DocumentTemplateMeta }[] {
  if (!existsSync(TEMPLATES_DIR)) return []

  return readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const meta = readYaml<DocumentTemplateMeta>(join(TEMPLATES_DIR, d.name, 'meta.yaml'))
      if (!meta) return null
      return { name: d.name, meta }
    })
    .filter((t): t is { name: string; meta: DocumentTemplateMeta } => t !== null)
}

export function getDocumentTemplate(name: string): { meta: DocumentTemplateMeta; template: string } | null {
  const metaPath = join(TEMPLATES_DIR, name, 'meta.yaml')
  const templatePath = join(TEMPLATES_DIR, name, 'template.hbs')

  const meta = readYaml<DocumentTemplateMeta>(metaPath)
  if (!meta) return null
  if (!existsSync(templatePath)) return null

  const template = readFileSync(templatePath, 'utf-8')
  return { meta, template }
}

// ========== DOCUMENT DRAFTS ==========

export function getDocumentsByClient(clientId: string): DocumentDraft[] {
  const client = getClientById(clientId)
  if (!client) return []

  const docsDir = join(CLIENTS_DIR, client.slug, 'documents')
  if (!existsSync(docsDir)) return []

  return readdirSync(docsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJson<DocumentDraft>(join(docsDir, f)))
    .filter((d): d is DocumentDraft => d !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getDocumentById(id: string): DocumentDraft | null {
  const clients = getAllClients()
  for (const client of clients) {
    const docsDir = join(CLIENTS_DIR, client.slug, 'documents')
    if (!existsSync(docsDir)) continue

    const filePath = join(docsDir, `${id}.json`)
    const doc = readJson<DocumentDraft>(filePath)
    if (doc) return doc
  }
  return null
}

export function createDocument(data: Omit<DocumentDraft, 'id' | 'createdAt' | 'updatedAt'>): DocumentDraft {
  const client = getClientById(data.clientId)
  if (!client) throw new Error(`Client not found: ${data.clientId}`)

  const now = new Date().toISOString()
  const doc: DocumentDraft = {
    ...data,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
  }

  const docsDir = join(CLIENTS_DIR, client.slug, 'documents')
  ensureDir(docsDir)
  writeJson(join(docsDir, `${doc.id}.json`), doc)

  return doc
}

export function updateDocument(id: string, updates: Partial<DocumentDraft>): DocumentDraft | null {
  const doc = getDocumentById(id)
  if (!doc) return null

  const client = getClientById(doc.clientId)
  if (!client) return null

  const updated: DocumentDraft = {
    ...doc,
    ...updates,
    id: doc.id,
    clientId: doc.clientId,
    updatedAt: new Date().toISOString(),
  }

  writeJson(join(CLIENTS_DIR, client.slug, 'documents', `${id}.json`), updated)
  return updated
}

export function deleteDocument(id: string): boolean {
  const clients = getAllClients()

  for (const client of clients) {
    const docsDir = join(CLIENTS_DIR, client.slug, 'documents')
    if (!existsSync(docsDir)) continue

    const filePath = join(docsDir, `${id}.json`)
    if (existsSync(filePath)) {
      unlinkSync(filePath)
      return true
    }
  }

  return false
}
