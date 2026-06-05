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
        <button
          key={toast.id}
          type="button"
          onClick={() => onRemove(toast.id)}
          className={`toast-card toast-${toast.tone ?? 'info'} text-left`}
        >
          <div className="text-sm font-semibold">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 text-xs text-slate-600">{toast.description}</div>
          ) : null}
        </button>
      ))}
    </div>
  )
}
