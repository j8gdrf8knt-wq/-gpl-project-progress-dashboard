import type { ProgressMetrics } from '@/types'

interface Props {
  metrics: ProgressMetrics
  activitiesCount: number
}

export default function KpiCards({ metrics, activitiesCount }: Props) {
  const cards = [
    {
      label: 'Overall % Complete',
      value: `${metrics.totalPct}%`,
      sub: 'Sum of % Project Achievement',
      color: 'var(--gpl-blue)',
    },
    {
      label: "Today's Rate %",
      value: `${metrics.todayRatePct}%`,
      sub: "Sum of % today's achievement",
      color: 'var(--gpl-green)',
    },
    {
      label: 'Days Remaining',
      value: `${metrics.daysLeft}`,
      sub: 'Until target date',
      color: 'var(--gpl-amber)',
    },
    {
      label: 'Manpower Today',
      value: `${metrics.manpowerDeployed}`,
      sub: `vs ${metrics.manpowerRequired} required`,
      color: 'var(--gpl-purple)',
    },
    {
      label: 'Activities',
      value: `${activitiesCount}`,
      sub: 'Total tracked items',
      color: 'var(--gpl-blue)',
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border relative overflow-hidden p-4"
          style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{ background: c.color }}
          />
          <div
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'var(--gpl-text2)' }}
          >
            {c.label}
          </div>
          <div className="text-3xl font-bold leading-none" style={{ color: c.color }}>
            {c.value}
          </div>
          <div className="text-[11px] mt-2" style={{ color: 'var(--gpl-text2)' }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
