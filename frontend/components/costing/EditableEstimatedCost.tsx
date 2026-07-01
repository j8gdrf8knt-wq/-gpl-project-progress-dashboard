'use client'
import { useState } from 'react'
import { fmtBDT } from '@/lib/formatters'

export default function EditableEstimatedCost({
  projectId,
  initialValue,
}: {
  projectId: string
  initialValue: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [displayValue, setDisplayValue] = useState(initialValue)
  const [inputValue, setInputValue] = useState(initialValue.toString())

  const handleEdit = () => {
    setIsEditing(true)
    setInputValue(value.toString())
  }

  const handleCancel = () => {
    setIsEditing(false)
    setInputValue(value.toString())
  }

  const handleSave = async () => {
    const newValue = parseFloat(inputValue)
    if (isNaN(newValue) || newValue < 0) {
      alert('Please enter a valid number')
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimatedCost: newValue }),
      })

      if (response.ok) {
        setValue(newValue)
        setDisplayValue(newValue)
        setIsEditing(false)
      } else {
        alert('Failed to save estimated cost')
      }
    } catch (error) {
      console.error('Error saving estimated cost:', error)
      alert('Error saving estimated cost')
    }
  }

  return (
    <div className="rounded-2xl border relative overflow-hidden p-4" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--gpl-blue)' }} />

      {!isEditing ? (
        <>
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--gpl-text2)' }}>Total Estimated Cost</div>
            <button
              onClick={handleEdit}
              className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(100,150,255,.2)', color: 'var(--gpl-blue)' }}
              title="Edit estimated cost"
            >
              ✏️
            </button>
          </div>
          <div
            className="text-xl font-bold leading-none truncate cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: 'var(--gpl-blue)' }}
            onClick={handleEdit}
          >
            ৳ {fmtBDT(displayValue)}
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gpl-text2)' }}>Edit Estimated Cost</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 px-2 py-2 text-sm rounded border"
              style={{ background: 'var(--gpl-surface)', borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }}
              placeholder="Enter amount"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="px-3 py-2 text-xs font-medium rounded"
              style={{ background: 'var(--gpl-green)', color: 'white' }}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-xs font-medium rounded"
              style={{ background: 'var(--gpl-border)', color: 'var(--gpl-text2)' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
