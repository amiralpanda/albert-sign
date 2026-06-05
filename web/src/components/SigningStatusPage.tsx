import type { ReactNode } from 'react'
import { AtomeLogo, ExternalLink } from '@/components/ui/Icon'

interface ActionLink {
  label: string
  href: string
  external?: boolean
}

interface SigningStatusPageProps {
  icon: ReactNode
  title: string
  description: string
  hint?: string
  primaryAction?: ActionLink
  secondaryAction?: ActionLink
}

export function SigningStatusPage({
  icon,
  title,
  description,
  hint,
  primaryAction,
  secondaryAction,
}: SigningStatusPageProps) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="px-6 py-5">
        <a
          href="https://atome.sh"
          className="inline-flex items-center gap-2 text-zinc-900 hover:opacity-80 transition-opacity"
          target="_blank"
          rel="noopener noreferrer"
        >
          <AtomeLogo className="h-7 w-auto" />
          <span className="text-sm font-semibold tracking-tight">Atome</span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full">
              {icon}
            </div>
            <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{description}</p>
            {hint ? <p className="mt-2 text-sm text-zinc-500">{hint}</p> : null}

            <div className="mt-8 flex flex-col gap-3">
              {primaryAction ? (
                <a
                  href={primaryAction.href}
                  target={primaryAction.external === false ? undefined : '_blank'}
                  rel={primaryAction.external === false ? undefined : 'noopener noreferrer'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  {primaryAction.label}
                  {primaryAction.external !== false ? <ExternalLink className="h-4 w-4" /> : null}
                </a>
              ) : null}
              {secondaryAction ? (
                <a
                  href={secondaryAction.href}
                  target={secondaryAction.external === false ? undefined : '_blank'}
                  rel={secondaryAction.external === false ? undefined : 'noopener noreferrer'}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {secondaryAction.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export function InvalidSigningLinkPage() {
  return (
    <SigningStatusPage
      icon={
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      }
      title="Lien de signature invalide"
      description="Ce lien a expiré, a déjà été utilisé, ou l'URL est incorrecte."
      hint="Demandez un nouveau lien à la personne qui vous a invité à signer."
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
