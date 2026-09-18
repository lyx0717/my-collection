import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type ToastKind = 'ok' | 'err'
interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const push = useCallback((text: string, kind: ToastKind = 'ok') => {
    const id = ++idRef.current
    setItems((prev) => [...prev, { id, kind, text }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-rise flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${
              t.kind === 'ok'
                ? 'border-line bg-surface/95 text-ink'
                : 'border-danger/30 bg-surface/95 text-danger'
            }`}
          >
            {t.kind === 'ok' ? (
              <CheckCircle2 size={15} className="text-success" />
            ) : (
              <AlertCircle size={15} />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
