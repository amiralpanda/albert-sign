import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Loader2, FileText, AlertTriangle } from '@/components/ui/Icon'
import { SigningStatusPage } from '@/components/SigningStatusPage'
import { apiUrl } from '@/lib/api-base'
import {
  ensureSignatureFont,
  isCanvasEmpty,
  renderTypedSignatureImage,
} from '@/lib/signature-image'

interface SigningPayload {
  documentTitle: string
  clientName: string
  signerEmail: string
  expiresAt: string
  html: string
}

type SignatureMode = 'type' | 'draw'

export function ContractSignPage() {
  const { token } = useParams<{ token: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  const [payload, setPayload] = useState<SigningPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  const [signerName, setSignerName] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('type')
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    void ensureSignatureFont()
  }, [])

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
    if (signatureMode !== 'draw') return
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas, payload, signatureMode])

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
    setHasDrawn(true)
  }

  const endDraw = () => {
    drawing.current = false
  }

  const clearDrawSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    resizeCanvas()
  }

  const hasValidSignature =
    signatureMode === 'type' ? signerName.trim().length > 1 : hasDrawn

  const handleSubmit = async () => {
    if (!token || !consent || !signerName.trim() || !hasValidSignature) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      let signatureImage: string
      if (signatureMode === 'type') {
        await ensureSignatureFont()
        signatureImage = renderTypedSignatureImage(signerName.trim())
      } else {
        const canvas = canvasRef.current
        if (!canvas || isCanvasEmpty(canvas)) {
          setSubmitError('Dessinez votre signature ou utilisez le mode Écrire.')
          setSubmitting(false)
          return
        }
        signatureImage = canvas.toDataURL('image/png')
      }

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
      setDoneMessage(
        data.message ||
          'Signature enregistrée. Vous recevrez le contrat signé par email sous peu.',
      )
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const modeBtnClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
      active
        ? 'bg-white text-zinc-900 shadow-sm'
        : 'text-zinc-600 hover:text-zinc-900'
    }`

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500">Chargement du contrat…</p>
      </div>
    )
  }

  if (error) {
    return (
      <SigningStatusPage
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
        }
        title="Impossible d'ouvrir ce contrat"
        description={error}
        hint="Contactez la personne qui vous a invité, ou l'équipe Atome pour obtenir un nouveau lien."
        primaryAction={{
          label: 'Découvrir Atome',
          href: 'https://atome.sh',
        }}
        secondaryAction={{
          label: "Contacter l'équipe",
          href: 'mailto:jeremy@atome.sh?subject=Nouveau%20lien%20de%20signature',
          external: false,
        }}
      />
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
          <p className="text-sm text-zinc-600">{doneMessage}</p>
        </div>
      </div>
    )
  }

  if (!payload?.html) return null

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      <header className="bg-white border-b border-zinc-200 flex-shrink-0 z-20 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto w-full">
          <FileText className="w-5 h-5 text-zinc-700 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Atome</p>
            <h1 className="text-sm font-semibold text-zinc-900 truncate">{payload.documentTitle}</h1>
            <p className="text-xs text-zinc-500 truncate">{payload.clientName}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 max-w-7xl mx-auto w-full">
        <section
          className="lg:flex-1 min-h-0 flex flex-col bg-white lg:m-4 lg:rounded-lg lg:border lg:border-zinc-200 lg:shadow-sm overflow-hidden"
          aria-label="Contrat"
        >
          <div className="flex-1 min-h-[50vh] lg:min-h-0 overflow-hidden">
            <iframe
              title="Contrat"
              srcDoc={payload.html}
              className="w-full h-full min-h-[50vh] lg:min-h-[480px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </section>

        <aside
          className="w-full lg:w-[400px] flex-shrink-0 bg-white lg:m-4 lg:ml-0 lg:rounded-lg lg:border lg:border-zinc-200 lg:shadow-sm flex flex-col"
          aria-label="Signature"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">Votre signature</h2>

            <label className="block text-sm">
              <span className="block font-medium text-zinc-700 mb-1">Nom complet *</span>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="Prénom Nom"
                autoComplete="name"
              />
            </label>

            <label className="block text-sm">
              <span className="block font-medium text-zinc-700 mb-1">Qualité</span>
              <input
                type="text"
                value={signerTitle}
                onChange={e => setSignerTitle(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="Gérant, Président…"
              />
            </label>

            <label className="block text-sm">
              <span className="block font-medium text-zinc-700 mb-1">Email *</span>
              <input
                type="email"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                autoComplete="email"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700">Signature *</span>
              </div>

              <div className="flex rounded-lg border border-zinc-200 p-1 bg-zinc-100 mb-3">
                <button
                  type="button"
                  className={modeBtnClass(signatureMode === 'type')}
                  onClick={() => setSignatureMode('type')}
                >
                  Écrire
                </button>
                <button
                  type="button"
                  className={modeBtnClass(signatureMode === 'draw')}
                  onClick={() => setSignatureMode('draw')}
                >
                  Dessiner
                </button>
              </div>

              {signatureMode === 'type' ? (
                <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 min-h-[7.5rem] py-4 flex items-center justify-center px-6">
                  {signerName.trim() ? (
                    <p
                      className="text-[2rem] leading-[1.35] text-zinc-900 truncate max-w-full"
                      style={{ fontFamily: '"Dancing Script", cursive' }}
                    >
                      {signerName.trim()}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400">Aperçu — saisissez votre nom ci-dessus</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex justify-end mb-1">
                    <button
                      type="button"
                      onClick={clearDrawSignature}
                      className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                    >
                      Effacer
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-28 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 flex-shrink-0 rounded border-zinc-300"
              />
              <span>
                J&apos;ai lu le contrat et je le signe électroniquement. Je reconnais que cette signature
                a la même valeur qu&apos;une signature manuscrite.
              </span>
            </label>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>

          <div className="flex-shrink-0 p-6 pt-0 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !consent || !signerName.trim() || !hasValidSignature}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
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
