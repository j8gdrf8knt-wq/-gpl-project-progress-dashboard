'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BOQItem, ExpenseEntry } from '@/types'
import ColumnMapperModal from './ColumnMapperModal'

interface DetectionResult {
  type: 'expenses' | 'activities' | 'mixed' | 'unknown'
  sheets: string[]
  selectedSheet: string
  headers: string[]
  mapping: Record<string, number | undefined>
  preview: unknown[][]
  confidence: number
}

export default function ExcelDropZone({
  projectId,
  onImportSuccess,
}: {
  projectId: string
  onImportSuccess?: () => void
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [showMapper, setShowMapper] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null)

  async function detectFile(file: File) {
    setCurrentFile(file)
    setIsDetecting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/detect', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Detection failed')

      const result = await response.json()
      setDetectionResult(result)
      setShowMapper(true)
    } catch (error) {
      console.error('Detection error:', error)
      alert('Failed to detect file type. Please try again.')
    } finally {
      setIsDetecting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('spreadsheet')) {
        detectFile(file)
      } else {
        alert('Please drop an Excel file (.xlsx or .xls)')
      }
    }
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      detectFile(files[0])
    }
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleClick}
        className="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: isDragging ? 'var(--gpl-blue)' : 'var(--gpl-border)',
          background: isDragging ? 'rgba(0,100,255,.1)' : 'rgba(30,48,80,.2)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isDetecting ? (
          <div style={{ color: 'var(--gpl-text2)' }}>
            <div className="text-sm font-medium mb-2">Analyzing file...</div>
            <div className="text-xs">Detecting data type and columns</div>
          </div>
        ) : (
          <div style={{ color: 'var(--gpl-text2)' }}>
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium mb-1">Drag and drop your Excel file here</div>
            <div className="text-xs">or click to browse • Supports .xlsx and .xls</div>
            <div className="text-xs mt-3" style={{ color: 'var(--gpl-text2)' }}>
              Intelligently detects expenses, activities, or mixed data
            </div>
          </div>
        )}
      </div>

      {detectionResult && currentFile && (
        <ColumnMapperModal
          isOpen={showMapper}
          onClose={() => {
            setShowMapper(false)
            setDetectionResult(null)
            setCurrentFile(null)
          }}
          detectionResult={detectionResult}
          file={currentFile}
          projectId={projectId}
          onImportSuccess={() => {
            router.refresh()
            onImportSuccess?.()
            setShowMapper(false)
            setDetectionResult(null)
            setCurrentFile(null)
          }}
        />
      )}
    </>
  )
}
