import { LoaderCircle, Search, X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { clsx } from 'clsx'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-black/55">{description}</p>}</div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </header>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-sm text-black/50"><LoaderCircle className="size-7 animate-spin text-forest" /><span>{label}</span></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="card flex min-h-48 flex-col items-center justify-center p-6 text-center"><p className="font-semibold">We couldn't load this view</p><p className="mt-1 text-sm text-black/50">{message}</p>{retry && <button className="btn-secondary mt-4" onClick={retry}>Try again</button>}</div>
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 p-6 text-center"><p className="font-semibold">{title}</p><p className="mt-1 max-w-md text-sm text-black/50">{message}</p>{action && <div className="mt-4">{action}</div>}</div>
}

export function StatusBadge({ status }: { status: string }) {
  const color = status === 'approved' || status === 'active' || status === 'completed' ? 'bg-emerald-100 text-emerald-800' : status === 'rejected' || status === 'inactive' ? 'bg-red-100 text-red-700' : status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'
  return <span className={clsx('pill capitalize', color)}>{status}</span>
}

export function SearchField({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="relative block"><Search className="absolute left-3 top-3 size-4 text-black/35" /><input aria-label="Search" className="field pl-9" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.currentTarget === event.target) onClose() }}>
    <section role="dialog" aria-modal="true" aria-label={title} className={clsx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl sm:p-7', wide ? 'max-w-3xl' : 'max-w-lg')}>
      <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl font-semibold">{title}</h2><button aria-label="Close" className="rounded-lg p-2 hover:bg-black/5" onClick={onClose}><X className="size-5" /></button></div>
      {children}
    </section>
  </div>
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', dangerous, busy, onClose, onConfirm }: { open: boolean; title: string; message: string; confirmLabel?: string; dangerous?: boolean; busy?: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal open={open} onClose={onClose} title={title}><p className="text-sm leading-6 text-black/60">{message}</p><div className="mt-6 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className={dangerous ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Working...' : confirmLabel}</button></div></Modal>
}

export function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null }

export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : '—'
export const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
