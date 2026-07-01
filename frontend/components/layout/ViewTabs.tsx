'use client'
import Link from 'next/link'

interface ViewTabsProps {
  projectId: string
  active: 'progress' | 'costing'
}

export default function ViewTabs({ projectId, active }: ViewTabsProps) {
  const tabs = [
    { key: 'progress', label: 'Progress Tracking' },
    { key: 'costing', label: 'BOQ / Costing' },
  ] as const

  return (
    <div
      className="sticky top-[60px] z-40 flex border-b px-6"
      style={{ background: 'var(--gpl-surface)', borderColor: 'var(--gpl-border)' }}
    >
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <Link
            key={t.key}
            href={`/projects/${projectId}/${t.key}`}
            className="relative px-4 py-3 text-sm font-medium transition-colors"
            style={{ color: isActive ? 'var(--gpl-blue)' : 'var(--gpl-text2)' }}
          >
            {t.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: 'var(--gpl-blue)' }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
