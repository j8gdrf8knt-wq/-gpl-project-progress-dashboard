'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Project } from '@/types'

interface TopbarProps {
  project?: Project
  projects?: Pick<Project, 'id' | 'name'>[]
  view?: 'progress' | 'costing'
}

export default function Topbar({ project, projects = [], view }: TopbarProps) {
  const router = useRouter()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-4 px-6 h-[60px] border-b"
      style={{ background: 'var(--gpl-surface)', borderColor: 'var(--gpl-border)' }}
    >
      {/* Logo */}
      <Link href="/projects">
        <div
          className="px-3 py-1.5 rounded-lg font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, var(--gpl-blue), var(--gpl-blue2))' }}
        >
          GPL
        </div>
      </Link>

      {/* Project name */}
      <div className="flex-1 min-w-0">
        {project ? (
          <>
            <div className="font-semibold text-sm truncate" style={{ color: 'var(--gpl-text)' }}>
              {project.name}
            </div>
            {(project.subtitle || project.client) && (
              <div className="text-xs truncate" style={{ color: 'var(--gpl-text2)' }}>
                {[project.subtitle, project.client].filter(Boolean).join(' · ')}
              </div>
            )}
          </>
        ) : (
          <span className="font-semibold text-sm" style={{ color: 'var(--gpl-text)' }}>
            Green Power Ltd.
          </span>
        )}
      </div>

      {/* Live clock */}
      <div className="text-xs font-mono hidden sm:block" style={{ color: 'var(--gpl-text2)' }}>
        {time}
      </div>

      {/* Project switcher */}
      {projects.length > 0 && project && (
        <select
          value={project.id}
          onChange={(e) => router.push(`/projects/${e.target.value}/${view ?? 'progress'}`)}
          className="text-xs rounded-lg px-3 py-1.5 border outline-none"
          style={{
            background: 'var(--gpl-card)',
            borderColor: 'var(--gpl-border)',
            color: 'var(--gpl-text)',
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Manage projects link */}
      <Link
        href="/projects"
        className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
        style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)' }}
      >
        All Projects
      </Link>
    </header>
  )
}
