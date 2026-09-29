import { useEffect, useId, useRef, type ReactNode } from 'react'

export interface DialogAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'danger' | 'plain'
}

interface DialogProps {
  title: string
  message?: ReactNode
  children?: ReactNode
  actions: DialogAction[]
  onClose: () => void
}

/** A small bottom sheet used for confirmations and the link prompt. */
export function Dialog({ title, message, children, actions, onClose }: DialogProps) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    sheetRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {message && <p className="dialog-message">{message}</p>}
        {children}
        <div className="dialog-actions">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`dialog-btn is-${a.variant ?? 'plain'}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
