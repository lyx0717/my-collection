import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = '确认',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-6 backdrop-blur-[3px]"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="animate-pop w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-bold text-ink">{title}</h3>
        <p className="mt-2 text-[13px] leading-6 text-ink2">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-9 rounded-[10px] border border-line2 px-4 text-[13px] font-medium text-ink2 transition-colors hover:bg-surface-2"
          >
            取消
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`h-9 rounded-[10px] px-4 text-[13px] font-semibold text-white transition-colors ${
              danger ? 'bg-danger hover:bg-[#d03d42]' : 'bg-accent hover:bg-accent-ink'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
