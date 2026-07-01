'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  view: 'progress' | 'costing'
}

export default function ImportBanner({ projectId, view }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState('')

  async function handleFile(file: File) {
    setImporting(true)
    setStatus('Importing…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      const data = await res.json()

      if (view === 'progress' && data.activities?.length) {
        await fetch(`/api/projects/${projectId}/activities`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.activities),
        })
        setStatus(`✓ Imported ${data.activities.length} activities`)
        router.refresh()
      } else {
        setStatus('No data found in file')
      }
    } catch {
      setStatus('Import failed')
    } finally {
      setImporting(false)
      setTimeout(() => setStatus(''), 3000)
    }
  }

  return (
    <div
      className="sticky top-[100px] z-30 flex items-center gap-3 px-6 py-2.5 border-b"
      style={{ background: 'var(--gpl-surface)', borderColor: 'var(--gpl-border)' }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: 'var(--gpl-blue)', color: 'var(--gpl-blue)' }}
      >
        📂 Import Excel
      </button>

      {status && (
        <span className="text-xs" style={{ color: 'var(--gpl-text2)' }}>
          {status}
        </span>
      )}
    </div>
  )
}
