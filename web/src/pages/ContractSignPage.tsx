import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Loader2, FileText } from '@/components/ui/Icon'
import { apiUrl } from '@/lib/api-base'

interface SigningPayload {
  documentTitle: string
  clientName: string
  signerEmail: string
  expiresAt: string
  html: string
}

export function ContractSignPage() {
  const { token } = useParams<{ token: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  const [payload, setPayload] = useState<SigningPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [signerName, setSignerName] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(apiUrl(`/api/signing/${token}`))
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Lien invalide')
        setPayload(data)
        setSignerEmail(data.signerEmail || '')
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [token])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#18181b'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas, payload])

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    const p = getCanvasPoint(e)
    ctx?.beginPath()
    ctx?.moveTo(p.x, p.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    const p = getCanvasPoint(e)
    ctx?.lineTo(p.x, p.y)
    ctx?.stroke()
  }

  const endDraw = () => {
    drawing.current = false
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    resizeCanvas()
  }

  const handleSubmit = async () => {
    if (!token || !consent || !signerName.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    const canvas = canvasRef.current
    const signatureImage = canvas?.toDataURL('image/png')

    try {
      const res = await fetch(apiUrl(`/api/signing/${token}/sign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          signerEmail: signerEmail.trim(),
          signatureImage,
          consent: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Échec de la signature')
      setDone(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-medium text-zinc-900">{error}</p>
          <p className="mt-2 text-sm text-zinc-500">Contactez Atome si vous avez besoin d&apos;un nouveau lien.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-700">
            <Check className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Merci, document signé</h1>
          <p className="text-sm text-zinc-600">
            Vous recevrez un email avec le contrat signé en pièce jointe.
          </p>
        </div>
      </div>
    )
  }

  if (!payload) return null

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      <header className="bg-white border-b border-zinc-200 flex-shrink-0 z-20">
        <div className="px-4 py-3 flex items-center gap-3">
          <FileText className="w-5 h-5 text-zinc-700 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Atome</p>
            <h1 className="text-sm font-semibold text-zinc-900 truncate">{payload.documentTitle}</h1>
            <p className="text-xs text-zinc-500 truncate">{payload.clientName}</p>
          </div>
        </div>
      </header>

      {/* Contrat à gauche, signature à droite (empilé sur très petit écran) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <section
          className="md:flex-1 min-h-0 flex flex-col bg-white md:border-r border-zinc-200"
          aria-label="Contrat"
        >
          <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50 md:hidden">
            <p className="text-xs font-medium text-zinc-600">Document — faites défiler pour lire</p>
          </div>
          <div className="flex-1 min-h-[42vh] md:min-h-0 overflow-hidden">
            <iframe
              title="Contrat"
              srcDoc={payload.html}
              className="w-full h-full min-h-[42vh] md:min-h-0 border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </section>

        <aside
          className="w-full md:w-[min(100%,420px)] lg:w-[440px] flex-shrink-0 bg-white border-t md:border-t-0 flex flex-col md:max-h-[calc(100vh-3.5rem)] md:sticky md:top-0 md:self-start"
          aria-label="Signature"
        >
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">Votre signature</h2>

            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Nom complet *</span>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Prénom Nom"
                autoComplete="name"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Qualité</span>
              <input
                type="text"
                value={signerTitle}
                onChange={e => setSignerTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Gérant, Président…"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-zinc-700">Email *</span>
              <input
                type="email"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                autoComplete="email"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700">Signature *</span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                >
                  Effacer
                </button>
              </div>
              <canvas
                ref={canvasRef}
                className="w-full h-28 rounded-lg border-2 border-dashed border-zinc-300 bg-white touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 flex-shrink-0"
              />
              <span>
                J&apos;ai lu le contrat et je le signe électroniquement. Je reconnais que cette signature
                a la même valeur qu&apos;une signature manuscrite.
              </span>
            </label>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>

          <div className="flex-shrink-0 p-5 pt-0 border-t border-zinc-100 bg-white">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !consent || !signerName.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Signer le document
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
