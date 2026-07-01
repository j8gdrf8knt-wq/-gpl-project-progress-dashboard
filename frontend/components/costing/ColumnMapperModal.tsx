'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BOQItem } from '@/types'

interface DetectionResult {
  type: 'expenses' | 'activities' | 'mixed' | 'unknown'
  sheets: string[]
  selectedSheet: string
  headers: string[]
  mapping: Record<string, number>
  preview: unknown[][]
  confidence: number
}

const REQUIRED_EXPENSE_FIELDS = ['date', 'amount', 'category', 'description']
const REQUIRED_ACTIVITY_FIELDS = ['name', 'qty', 'unit']

export default function ColumnMapperModal({
  isOpen,
  onClose,
  detectionResult,
  file,
  projectId,
  onImportSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  detectionResult: DetectionResult
  file: File
  projectId: string
  onImportSuccess: () => void
}) {
  const router = useRouter()
  const [mapping, setMapping] = useState(detectionResult.mapping)
  const [isImporting, setIsImporting] = useState(false)

  const isExpense = detectionResult.type === 'expenses'
  const requiredFields = isExpense ? REQUIRED_EXPENSE_FIELDS : REQUIRED_ACTIVITY_FIELDS

  const allMapped = requiredFields.every(field => mapping[field] !== undefined)

  async function handleImport() {
    if (!allMapped) {
      alert('Please map all required fields')
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', detectionResult.type)
      formData.append('projectId', projectId)
      formData.append('mapping', JSON.stringify(mapping))
      formData.append('sheet', detectionResult.selectedSheet)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Import failed')

      router.refresh()
      onImportSuccess()
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import data. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gpl-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--gpl-text)' }}>
            Map Columns ({detectionResult.type === 'expenses' ? 'Expenses' : 'Activities'})
          </h2>
          <button onClick={onClose} style={{ color: 'var(--gpl-text2)' }}>✕</button>
        </div>

        <div className="overflow-auto flex-1 p-5">
          <div className="mb-4">
            <div className="text-xs mb-2" style={{ color: 'var(--gpl-text2)' }}>
              Detected {detectionResult.headers.length} columns with {Math.round(detectionResult.confidence * 100)}% confidence
            </div>
          </div>

          <div className="space-y-4">
            {requiredFields.map((field) => (
              <div key={field}>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--gpl-text2)' }}>
                  {field.toUpperCase()} <span style={{ color: 'var(--gpl-red)' }}>*</span>
                </label>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [field]: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]"
                  style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }}
                >
                  <option value="">Select column...</option>
                  {detectionResult.headers.map((header, idx) => (
                    <option key={idx} value={idx}>
                      {header} {mapping[field] === idx && '✓'}
                    </option>
                  ))}
                </select>
                {mapping[field] !== undefined && (
                  <div className="text-xs mt-1" style={{ color: 'var(--gpl-text2)' }}>
                    Preview: {detectionResult.preview[0]?.[mapping[field]]}
                  </div>
                )}
              </div>
            ))}

            {detectionResult.type === 'unknown' && (
              <div className="p-3 rounded" style={{ background: 'rgba(255,150,0,.1)', borderLeft: '3px solid var(--gpl-amber)' }}>
                <div className="text-xs" style={{ color: 'var(--gpl-text2)' }}>
                  ⚠️ File type was not automatically detected. Please manually map the columns above to continue.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--gpl-border)' }}>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!allMapped || isImporting}
            className="px-4 py-2 text-sm rounded font-medium"
            style={{ background: allMapped ? 'var(--gpl-blue)' : 'var(--gpl-border)', color: 'white', opacity: isImporting ? 0.6 : 1, cursor: allMapped ? 'pointer' : 'not-allowed' }}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
