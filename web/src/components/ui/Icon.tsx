import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Add01Icon,
  Cancel01Icon,
  Tick01Icon,
  Loading01Icon,
  Delete01Icon,
  Upload01Icon,
  File01Icon,
  Calendar01Icon,
  UserIcon,
  Building01Icon,
  Presentation01Icon,
  Idea01Icon,
  Settings01Icon,
  AlertCircleIcon as AlertCircleHugeIcon,
  Link01Icon,
  Copy01Icon,
  Refresh01Icon,
  CheckmarkCircle01Icon,
  ViewIcon,
  Search01Icon,
  Time01Icon,
  Wrench01Icon,
  Message01Icon,
  StarIcon,
  Layers01Icon,
  Layout01Icon,
  BookOpen01Icon,
  Target01Icon,
  WorkflowCircle01Icon,
  Sun01Icon,
  Moon01Icon
} from '@hugeicons/core-free-icons'

// Re-export HugeIcon wrapper components with simpler names
export function ArrowRight({ className }: { className?: string }) {
  return <HugeiconsIcon icon={ArrowRight01Icon} className={className} />
}

export function ArrowLeft({ className }: { className?: string }) {
  return <HugeiconsIcon icon={ArrowLeft01Icon} className={className} />
}

export function ChevronLeft({ className }: { className?: string }) {
  return <HugeiconsIcon icon={ArrowLeft01Icon} className={className} />
}

export function ChevronRight({ className }: { className?: string }) {
  return <HugeiconsIcon icon={ArrowRight01Icon} className={className} />
}

export function Plus({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Add01Icon} className={className} />
}

export function X({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Cancel01Icon} className={className} />
}

export function Check({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Tick01Icon} className={className} />
}

export function Loader2({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Loading01Icon} className={className} />
}

export function Trash2({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Delete01Icon} className={className} />
}

export function Upload({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Upload01Icon} className={className} />
}

export function FileText({ className }: { className?: string }) {
  return <HugeiconsIcon icon={File01Icon} className={className} />
}

export function Calendar({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Calendar01Icon} className={className} />
}

export function User({ className }: { className?: string }) {
  return <HugeiconsIcon icon={UserIcon} className={className} />
}

export function Building2({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Building01Icon} className={className} />
}

export function Presentation({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Presentation01Icon} className={className} />
}

export function Lightbulb({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Idea01Icon} className={className} />
}

export function Settings({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Settings01Icon} className={className} />
}

export function AlertTriangle({ className }: { className?: string }) {
  return <HugeiconsIcon icon={AlertCircleHugeIcon} className={className} />
}

export function ExternalLink({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Link01Icon} className={className} />
}

export function Link({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Link01Icon} className={className} />
}

export function Copy({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Copy01Icon} className={className} />
}

export function RefreshCw({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Refresh01Icon} className={className} />
}

export function Circle({ className }: { className?: string }) {
  return <HugeiconsIcon icon={CheckmarkCircle01Icon} className={className} />
}

export function Eye({ className }: { className?: string }) {
  return <HugeiconsIcon icon={ViewIcon} className={className} />
}

export function Search({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Search01Icon} className={className} />
}

export function Clock({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Time01Icon} className={className} />
}

export function Wrench({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Wrench01Icon} className={className} />
}

export function MessageSquare({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Message01Icon} className={className} />
}

export function Star({ className }: { className?: string }) {
  return <HugeiconsIcon icon={StarIcon} className={className} />
}

// SVG-based icons for missing hugeicons
export function Quote({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
    </svg>
  )
}

export function Globe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function Database({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}

export function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function Smile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

export function Shield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export function Workflow({ className }: { className?: string }) {
  return <HugeiconsIcon icon={WorkflowCircle01Icon} className={className} />
}

export function Layers({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Layers01Icon} className={className} />
}

export function Layout({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Layout01Icon} className={className} />
}

export function BookOpen({ className }: { className?: string }) {
  return <HugeiconsIcon icon={BookOpen01Icon} className={className} />
}

export function Target({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Target01Icon} className={className} />
}

export function AlertCircle({ className }: { className?: string }) {
  return <HugeiconsIcon icon={AlertCircleHugeIcon} className={className} />
}

export function CheckCircle({ className }: { className?: string }) {
  return <HugeiconsIcon icon={CheckmarkCircle01Icon} className={className} />
}

export function Sun({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Sun01Icon} className={className} />
}

export function Moon({ className }: { className?: string }) {
  return <HugeiconsIcon icon={Moon01Icon} className={className} />
}

export function DollarSign({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export function AtomeLogo({ className = '', color = '#1A1E2C' }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 159 169" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M156.701 118.945L148.622 132.934C142.04 144.295 126.786 144.965 112.022 140.019C108.769 155.425 100.2 168.28 87.9138 168.28H71.73C58.5661 168.28 50.3581 155.425 47.2865 140.173C32.29 145.068 16.8547 144.089 10.7116 133.475L2.60683 119.486C-3.97511 108.099 3.07141 94.5481 14.764 84.2689C3.01978 73.7578-3.84604 59.9234 2.29709 49.335L10.4019 35.346C16.9838 23.959 32.2384 23.2892 47.0026 28.2356C50.2548 12.8297 58.8242 0 71.1131 0H87.2969C100.461 0 108.669 12.8554 111.74 28.1068C126.737 23.2119 142.172 24.1909 148.315 34.805L156.42 48.794C162.976 60.1552 155.93 73.7063 144.263 84.0112C156.007 94.4966 162.845 108.331 156.701 118.945ZM112.618 33.5427C112.953 36.3765 113.134 39.2362 113.134 42.07C113.134 50.9581 111.405 60.1037 108.075 67.5748C107.223 69.4812 106.268 71.2588 105.236 72.9076C103.197 76.1279 100.745 78.833 97.9312 80.7652C104.023 80.456 110.966 78.5754 117.935 75.149C119.226 74.5307 120.542 73.8351 121.833 73.088C122.659 72.5985 123.459 72.109 124.259 71.6195C140.004 61.6237 148.418 46.8361 143.153 37.7419C141.424 34.7535 138.429 32.744 134.609 31.662C133.422 31.3271 132.235 31.121 130.944 30.9922C130.505 30.9149 130.067 30.8891 129.654 30.8634C128.75 30.8118 127.847 30.7861 126.892 30.8119C126.427 30.8119 125.963 30.8376 125.472 30.8634C124.569 30.9149 123.639 30.9922 122.71 31.121C121.704 31.2498 120.671 31.4301 119.639 31.6362C119.226 31.7393 118.839 31.8166 118.4 31.8939C118.271 31.9196 118.116 31.9454 117.961 32.0227C116.928 32.2545 115.948 32.5122 114.889 32.8213C114.141 33.0274 113.392 33.285 112.618 33.5427ZM52.1907 30.1936C54.7976 31.3271 57.3788 32.6152 59.8309 34.0322C67.5485 38.4891 74.5951 44.5432 79.4218 51.1899C80.6349 52.8645 81.719 54.5648 82.6224 56.2909C84.4034 59.6658 85.5133 63.1179 85.7972 66.5186C88.5591 61.1085 90.4175 54.1268 90.9337 46.4239C91.0369 44.9812 91.0886 43.5385 91.0886 42.0443C91.0886 41.0911 91.0628 40.1121 91.0112 39.1846C90.211 20.5842 81.59 5.92536 71.0847 5.92536C67.626 5.92536 64.3737 7.49686 61.5344 10.2792C60.6568 11.1294 59.8567 12.0568 59.1082 13.1131C58.8242 13.448 58.5919 13.8087 58.3596 14.1693C57.8434 14.9164 57.3788 15.6893 56.94 16.5137C56.7077 16.9259 56.5012 17.3381 56.2689 17.7761C55.8559 18.5747 55.4687 19.4249 55.1074 20.3008C54.7202 21.2282 54.3588 22.2072 54.0233 23.2119C53.8942 23.5984 53.7652 23.9848 53.6361 24.397C53.5845 24.5258 53.5329 24.6804 53.507 24.835C53.1973 25.8397 52.9392 26.8444 52.6811 27.9007C52.5004 28.6478 52.3455 29.4207 52.1907 30.1936ZM19.0746 80.7909C21.346 79.0906 23.7464 77.5191 26.1985 76.1022C33.9161 71.6453 42.692 68.5796 50.8485 67.7294C52.9134 67.5233 54.9267 67.446 56.8884 67.5233C60.7343 67.6779 64.3221 68.4507 67.4194 69.945C64.0898 64.8182 58.9791 59.6915 52.5004 55.3892C51.3131 54.5906 50.0742 53.8177 48.7836 53.0706C47.9576 52.5811 47.1316 52.1431 46.2799 51.7309V51.7052C29.7089 43.1005 12.6991 43.2293 7.43356 52.3235C5.70419 55.3119 5.44603 58.8929 6.42686 62.7315C6.7366 63.9166 7.14964 65.0759 7.69168 66.2609C7.82074 66.6731 8.02722 67.0596 8.2337 67.4202C8.62088 68.2446 9.05969 69.0433 9.55011 69.8419C9.78242 70.2283 10.0405 70.6148 10.2986 71.0527C10.789 71.7999 11.3311 72.5727 11.9247 73.3198C12.5184 74.1185 13.1895 74.9171 13.9123 75.7157C14.1704 75.9991 14.4542 76.3083 14.7382 76.6174C14.8156 76.7462 14.9189 76.8493 15.048 76.9523C15.7707 77.7252 16.5192 78.4466 17.2936 79.2194C17.8614 79.7347 18.4551 80.2757 19.0746 80.7909ZM46.4089 134.686C46.0733 131.878 45.8927 129.044 45.8927 126.21C45.8927 117.296 47.622 108.151 50.9517 100.68C51.8035 98.7989 52.7585 97.0213 53.791 95.3725C55.8559 92.1522 58.2822 89.4471 61.0956 87.5149C55.0041 87.8241 48.0092 89.7047 41.0659 93.1054C39.7753 93.7494 38.4848 94.4193 37.1942 95.1664C36.3682 95.6559 35.5422 96.1453 34.7421 96.6348C18.9971 106.656 10.5826 121.444 15.8481 130.512C17.5775 133.501 20.5716 135.536 24.4175 136.592C25.579 136.927 26.7922 137.159 28.0827 137.288C28.5215 137.365 28.9345 137.391 29.3733 137.391C30.2767 137.468 31.1801 137.494 32.1093 137.442C32.5998 137.442 33.0644 137.417 33.5548 137.417C34.4582 137.365 35.3874 137.262 36.3166 137.133C37.3233 137.005 38.3557 136.85 39.3882 136.618C39.7754 136.541 40.1884 136.464 40.6013 136.36C40.7562 136.36 40.9111 136.309 41.0659 136.257C42.0726 136.026 43.0792 135.742 44.1375 135.433C44.886 135.227 45.6345 134.969 46.4089 134.686ZM106.834 138.035C104.201 136.927 101.646 135.639 99.1934 134.222C91.4758 129.765 84.4034 123.711 79.6025 117.09C78.3635 115.416 77.3053 113.715 76.4019 111.989C74.6209 108.614 73.5109 105.162 73.227 101.762C70.4652 107.172 68.6068 114.128 68.0906 121.83C67.9873 123.273 67.9357 124.742 67.9357 126.236C67.9357 127.189 67.9615 128.142 68.0131 129.07C68.7875 147.696 77.4343 162.355 87.9396 162.355C91.3983 162.355 94.6506 160.783 97.4898 158.001C98.3674 157.151 99.1676 156.223 99.9161 155.167C100.2 154.832 100.432 154.471 100.665 154.111C101.181 153.364 101.645 152.591 102.084 151.766C102.317 151.354 102.523 150.942 102.755 150.504C103.168 149.705 103.556 148.855 103.917 147.979C104.304 147.052 104.665 146.073 105.001 145.068C105.13 144.682 105.259 144.295 105.388 143.883C105.44 143.754 105.491 143.6 105.517 143.445C105.827 142.44 106.085 141.436 106.343 140.379C106.524 139.607 106.705 138.834 106.834 138.035ZM152.574 105.523C152.29 104.338 151.877 103.178 151.335 102.019C151.18 101.607 151 101.221 150.793 100.834C150.406 100.01 149.967 99.2368 149.477 98.4382C149.219 98.026 148.986 97.6396 148.702 97.2274C148.212 96.4803 147.67 95.7074 147.102 94.9603C146.483 94.1616 145.812 93.363 145.115 92.5644C144.857 92.2552 144.573 91.9718 144.289 91.6369C144.185 91.5339 144.082 91.4051 143.953 91.302C143.256 90.5549 142.508 89.8078 141.707 89.0607C141.165 88.5197 140.572 88.0044 139.978 87.4634C137.707 89.1895 135.28 90.761 132.828 92.1779C125.111 96.6348 116.335 99.7006 108.178 100.551C106.113 100.757 104.1 100.834 102.138 100.757C98.3184 100.602 94.7306 99.8294 91.6332 98.3609C94.9371 103.462 100.074 108.563 106.501 112.865C107.688 113.664 108.953 114.437 110.243 115.184C111.069 115.673 111.895 116.111 112.747 116.549C129.292 125.154 146.328 125.051 151.593 115.957C153.323 112.968 153.581 109.387 152.574 105.523Z" fill={color}/>
    </svg>
  )
}
