'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProjectButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    client: '',
    subtitle: '',
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.targetDate) return
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const project = await res.json()
    setSaving(false)
    setOpen(false)
    router.push(`/projects/${project.id}/progress`)
    router.refresh()
  }

  const inputCls =
    'w-full rounded-lg px-3 py-2 text-sm border outline-none focus:border-[var(--gpl-blue)]'
  const inputStyle = {
    background: 'var(--gpl-bg)',
    borderColor: 'var(--gpl-border)',
    color: 'var(--gpl-text)',
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--gpl-blue2)' }}
      >
        + New Project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--gpl-text)' }}>
              New Project
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--gpl-text2)' }}>
                  Project Name *
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Savar Cantonment Solar"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--gpl-text2)' }}>
                    Client / Location
                  </label>
                  <input
                    className={inputCls}
                    style={inputStyle}
                    value={form.client}
                    onChange={(e) => setForm({ ...form, client: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--gpl-text2)' }}>
                    Subtitle
                  </label>
                  <input
                    className={inputCls}
                    style={inputStyle}
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="e.g. Solar Installation"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--gpl-text2)' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    style={inputStyle}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--gpl-text2)' }}>
                    Target Date *
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    style={inputStyle}
                    value={form.targetDate}
                    onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--gpl-blue2)' }}
                >
                  {saving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
