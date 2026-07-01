import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { computeProgress } from '@/lib/computations'
import Topbar from '@/components/layout/Topbar'
import ViewTabs from '@/components/layout/ViewTabs'
import KpiCards from '@/components/progress/KpiCards'
import CompletionRing from '@/components/progress/CompletionRing'
import TimeRing from '@/components/progress/TimeRing'
import ActivityBarChart from '@/components/progress/ActivityBarChart'
import ManpowerBarChart from '@/components/progress/ManpowerBarChart'
import ActivityTable from '@/components/progress/ActivityTable'
import ImportBanner from '@/components/shared/ImportBanner'
import type { Activity } from '@/types'

export const dynamic = 'force-dynamic'

function serializeActivity(a: {
  id: string; projectId: string; name: string; qty: number; unit: string;
  todayAchiev: number; pctToday: number; totalPresent: number; pctTotal: number;
  pctProject: number; targetDate: Date | null; availDays: number; reqRate: number;
  reqManpower: number; personsDay: number; highlighted: boolean; order: number;
}): Activity {
  return { ...a, targetDate: a.targetDate ? a.targetDate.toISOString().slice(0, 10) : null }
}

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [project, allProjects] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { activities: { orderBy: { order: 'asc' } } },
    }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'desc' } }),
  ])

  if (!project) notFound()

  const activities = project.activities.map(serializeActivity)
  const metrics = computeProgress(
    activities,
    project.startDate.toISOString().slice(0, 10),
    project.targetDate.toISOString().slice(0, 10),
    project.reportDate?.toISOString().slice(0, 10) ?? null
  )

  const serializedProject = {
    ...project,
    startDate: project.startDate.toISOString().slice(0, 10),
    targetDate: project.targetDate.toISOString().slice(0, 10),
    reportDate: project.reportDate?.toISOString().slice(0, 10) ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    activities,
    items: [],
  }

  return (
    <div>
      <Topbar project={serializedProject} projects={allProjects} view="progress" />
      <ViewTabs projectId={id} active="progress" />
      <ImportBanner projectId={id} view="progress" />

      <main className="px-6 py-6 flex flex-col gap-5 max-w-[1600px] mx-auto">
        {/* KPI Cards */}
        <KpiCards metrics={metrics} activitiesCount={activities.length} />

        {/* Stats + Rings */}
        <div className="grid grid-cols-3 gap-4">
          {/* Stats panel */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
          >
            <div
              className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}
            >
              Overall Completion
            </div>
            <div className="p-4 flex flex-col divide-y divide-[var(--gpl-border)]">
              {[
                ['% Complete', `${metrics.totalPct}%`, 'var(--gpl-green)'],
                ['Days Elapsed', `${metrics.daysElapsed} / ${metrics.totalDays}`, ''],
                ['Time Used', `${metrics.timePct}%`, 'var(--gpl-amber)'],
                ['Report Date', metrics.reportDate, ''],
                ['Manpower Deployed', String(metrics.manpowerDeployed), ''],
                ['Manpower Required', String(metrics.manpowerRequired), ''],
              ].map(([label, value, color]) => (
                <div key={label} className="flex justify-between items-center py-2">
                  <span className="text-xs" style={{ color: 'var(--gpl-text2)' }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: color || 'var(--gpl-text)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Completion ring */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
          >
            <div
              className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}
            >
              Completion Ring
            </div>
            <div className="flex items-center justify-center p-6">
              <CompletionRing pct={metrics.totalPct} />
            </div>
          </div>

          {/* Time ring */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
          >
            <div
              className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}
            >
              Time Elapsed
            </div>
            <div className="flex items-center justify-center p-6">
              <TimeRing pct={metrics.timePct} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
          >
            <div
              className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}
            >
              % Completion by Activity
            </div>
            <div className="p-4">
              <ActivityBarChart activities={activities} />
            </div>
          </div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
          >
            <div
              className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}
            >
              Required Manpower per Activity
            </div>
            <div className="p-4">
              <ManpowerBarChart activities={activities} />
            </div>
          </div>
        </div>

        {/* Activity Table */}
        <ActivityTable activities={activities} projectId={id} daysWorked={metrics.daysWorked} />
      </main>
    </div>
  )
}
