'use client'
import { useEffect, useState, createContext, useContext, useCallback } from 'react'

type ToastType = 'green' | 'red' | 'amber' | 'blue'
interface Toast { id: number; message: string; type: ToastType }

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let counter = 0

  const showToast = useCallback((message: string, type: ToastType = 'green') => {
    const id = ++counter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  const colorMap: Record<ToastType, string> = {
    green: 'border-[var(--gpl-green)] text-[var(--gpl-green)]',
    red: 'border-[var(--gpl-red)] text-[var(--gpl-red)]',
    amber: 'border-[var(--gpl-amber)] text-[var(--gpl-amber)]',
    blue: 'border-[var(--gpl-blue)] text-[var(--gpl-blue)]',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-[var(--gpl-card)] border rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${colorMap[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
