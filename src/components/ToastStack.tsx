'use client'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone?: 'success' | 'error' | 'info'
}

interface ToastStackProps {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

export default function ToastStack({ toasts, onRemove }: ToastStackProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-card toast-${toast.tone ?? 'info'} flex items-start gap-3`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{toast.title}</div>
            {toast.description ? (
              <div className="mt-1 text-xs text-slate-600">{toast.description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors text-slate-500 hover:text-slate-700"
            aria-label="关闭"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
