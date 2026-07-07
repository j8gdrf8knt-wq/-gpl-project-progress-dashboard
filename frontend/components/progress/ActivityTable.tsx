'use client'
import { useState } from 'react'
import type { Activity } from '@/types'
import { activityCompletionPct, badgeColor } from '@/lib/computations'
import { fmtDate } from '@/lib/formatters'
import EditActivityModal from './EditActivityModal'
import BulkActivitiesPaster from './BulkActivitiesPaster'

const BADGE = {
  green: 'rgba(0,212,136,.18)',
  amber: 'rgba(245,166,35,.18)',
  red: 'rgba(255,77,109,.12)',
}
const BADGE_TEXT = { green: '#00d488', amber: '#f5a623', red: '#ff4d6d' }

interface Props {
  activities: Activity[]
  projectId: string
  daysWorked: number
}

export default function ActivityTable({ activities, projectId, daysWorked }: Props) {
  const [editOpen, setEditOpen] = useState(false)

  const headers = [
    'Activity', 'Qty', 'Unit', 'Today', '% Today', 'Avg Rate',
    'Total', '% Total', '% Project', 'Target Date', 'Avail', 'Req Rate', 'Req MP', 'P/Day',
  ]

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--gpl-border)', background: 'rgba(255,255,255,.015)' }}
      >
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--gpl-text2)' }}
        >
          Activity Detail
        </span>
        <div className="flex gap-2">
          <BulkActivitiesPaster projectId={projectId} />
          <button
            onClick={() => setEditOpen(true)}
            className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--gpl-blue)', color: 'var(--gpl-blue)' }}
          >
            ✏ Edit Data
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'rgba(11,22,40,.9)' }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-bold uppercase tracking-wider border-b whitespace-nowrap"
                  style={{ color: 'var(--gpl-text2)', borderColor: 'var(--gpl-border)', fontSize: 9 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-10" style={{ color: 'var(--gpl-text3)' }}>
                  No activities — import Excel or click Edit Data
                </td>
              </tr>
            ) : (
              activities.map((a) => {
                const comp = activityCompletionPct(a)
                const color = badgeColor(comp)
                const avgRate = (a.totalPresent / daysWorked).toFixed(2)
                return (
                  <tr
                    key={a.id}
                    className="border-b hover:bg-white/[.02] transition-colors"
                    style={{ borderColor: 'rgba(30,48,80,.4)', color: 'var(--gpl-text)' }}
                  >
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-right">{a.qty.toLocaleString()}</td>
                    <td className="px-3 py-2">{a.unit}</td>
                    <td className="px-3 py-2 text-right">{a.todayAchiev.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: 'rgba(79,156,249,.18)', color: '#4f9cf9' }}>
                        {a.pctToday.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{avgRate}</td>
                    <td className="px-3 py-2 text-right">{a.totalPresent.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: BADGE[color], color: BADGE_TEXT[color] }}>
                        {comp.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: 'rgba(79,156,249,.18)', color: '#4f9cf9' }}>
                        {a.pctProject.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(a.targetDate)}</td>
                    <td className="px-3 py-2 text-right">{a.availDays}</td>
                    <td className="px-3 py-2 text-right">{a.reqRate.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">{a.reqManpower}</td>
                    <td className="px-3 py-2 text-right">{a.personsDay}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <EditActivityModal
          activities={activities}
          projectId={projectId}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
