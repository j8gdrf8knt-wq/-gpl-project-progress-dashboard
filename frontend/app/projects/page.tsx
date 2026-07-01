import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtDate } from '@/lib/formatters'
import NewProjectButton from '@/components/shared/NewProjectButton'
import Topbar from '@/components/layout/Topbar'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { activities: true, items: true } } },
  })

  return (
    <div>
      <Topbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--gpl-text)' }}>
              Projects
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--gpl-text2)' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <NewProjectButton />
        </div>

        {projects.length === 0 ? (
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-card)' }}
          >
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--gpl-text)' }}>
              No projects yet
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--gpl-text2)' }}>
              Create your first project to start tracking progress
            </p>
            <NewProjectButton />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/progress`}>
                <div
                  className="rounded-2xl border p-5 cursor-pointer transition-all hover:border-[var(--gpl-blue)] hover:shadow-lg group"
                  style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
                >
                  <div
                    className="w-8 h-1 rounded mb-4"
                    style={{ background: 'var(--gpl-blue)' }}
                  />
                  <h3
                    className="font-semibold text-base mb-1 group-hover:text-[var(--gpl-blue)] transition-colors"
                    style={{ color: 'var(--gpl-text)' }}
                  >
                    {p.name}
                  </h3>
                  {p.client && (
                    <p className="text-xs mb-3" style={{ color: 'var(--gpl-text2)' }}>
                      {p.client}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs mt-4" style={{ color: 'var(--gpl-text2)' }}>
                    <span>{p._count.activities} activities</span>
                    <span>{p._count.items} BOQ items</span>
                  </div>
                  <div className="flex justify-between text-xs mt-3" style={{ color: 'var(--gpl-text3)' }}>
                    <span>Start: {fmtDate(p.startDate)}</span>
                    <span>Target: {fmtDate(p.targetDate)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
