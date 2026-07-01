import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'

const ACTIVITY_ALIASES: Record<string, string[]> = {
  name: ['activities', 'activity', 'description', 'item', 'task'],
  qty: ['qty', 'quantity', 'target qty'],
  unit: ['unit'],
  todayAchiev: ["today's achievement", 'today achievement', 'today achiev', 'daily achiev'],
  pctToday: ["% of today", "% today", "pct today", "today's %"],
  avgRate: ['average rate', 'avg rate'],
  totalPresent: ['total present', 'total achievement', 'cumulative'],
  pctTotal: ['% of total', 'pct total', '% total present'],
  pctProject: ['% project', 'project achiev', '% project achievement'],
  ect: ['ect', 'estimated completion'],
  targetDate: ['target completion date', 'target date', 'completion date'],
  availDays: ['available days', 'avail days'],
  reqRate: ['required rate', 'req rate'],
  reqManpower: ['required manpower', 'req manpower', 'req mp'],
  personsDay: ['person supposed', 'persons day', 'p/day', 'deployed'],
}

const EXPENSE_ALIASES: Record<string, string[]> = {
  date: ['date', 'date entry', 'entry date'],
  amount: ['amount', 'cost', 'expense', 'total'],
  category: ['category', 'type', 'expense type'],
  description: ['description', 'item', 'desc'],
  boqItem: ['boq item', 'boq', 'item name'],
  remarks: ['remarks', 'notes', 'comments'],
  adminPct: ['admin %', 'admin pct'],
  directPct: ['direct %', 'direct pct'],
  afterSalePct: ['after sale %', 'after sale pct'],
  contingencyPct: ['contingency %', 'contingency pct'],
}

function guessCol(header: string, aliases: string[]): boolean {
  const h = header.toLowerCase().trim()
  return aliases.some((a) => h.includes(a))
}

function autoMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(ACTIVITY_ALIASES)) {
    const idx = headers.findIndex((h) => guessCol(h, aliases))
    if (idx !== -1) map[field] = idx
  }
  return map
}

function parsePct(v: unknown): number {
  return parseFloat(String(v)) || 0
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const typeParam = formData.get('type') as string | null
  const mappingParam = formData.get('mapping') as string | null
  const sheetParam = formData.get('sheet') as string | null
  const projectIdParam = formData.get('projectId') as string | null

  const sheetName = sheetParam || wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]

  const headers = (rows[0] ?? []).map(String)
  const dataRows = rows.slice(1)

  let mapping: Record<string, number>
  if (mappingParam) {
    mapping = JSON.parse(mappingParam)
  } else {
    mapping = autoMap(headers)
  }

  // Handle expenses import
  if (typeParam === 'expenses' && projectIdParam) {
    const expenses = dataRows
      .filter((row) => {
        const dateIdx = mapping['date']
        const amountIdx = mapping['amount']
        return dateIdx !== undefined && amountIdx !== undefined && String(row[amountIdx] ?? '').trim() !== ''
      })
      .map((row) => ({
        date: new Date(String(row[mapping['date']] ?? '')),
        amount: parseFloat(String(row[mapping['amount']] ?? 0)),
        category: String(row[mapping['category']] ?? ''),
        description: String(row[mapping['description']] ?? ''),
        boqItemId: row[mapping['boqItem']] ? String(row[mapping['boqItem']]) : null,
        adminCost: (parseFloat(String(row[mapping['amount']] ?? 0)) * parsePct(row[mapping['adminPct']])) / 100 || 0,
        directCost: (parseFloat(String(row[mapping['amount']] ?? 0)) * parsePct(row[mapping['directPct']])) / 100 || 0,
        afterSale: (parseFloat(String(row[mapping['amount']] ?? 0)) * parsePct(row[mapping['afterSalePct']])) / 100 || 0,
        contingency: (parseFloat(String(row[mapping['amount']] ?? 0)) * parsePct(row[mapping['contingencyPct']])) / 100 || 0,
        remarks: row[mapping['remarks']] ? String(row[mapping['remarks']]) : null,
      }))

    await Promise.all(
      expenses.map(exp =>
        prisma.expenseEntry.create({
          data: {
            projectId: projectIdParam,
            ...exp,
          },
        })
      )
    )

    return NextResponse.json({ type: 'expenses', created: expenses.length })
  }

  // Handle activities import (default)
  const activities = dataRows
    .filter((row) => {
      const nameIdx = mapping['name']
      return nameIdx !== undefined && String(row[nameIdx] ?? '').trim() !== ''
    })
    .map((row) => ({
      name: String(row[mapping['name']] ?? ''),
      qty: parsePct(row[mapping['qty']]),
      unit: String(row[mapping['unit']] ?? ''),
      todayAchiev: parsePct(row[mapping['todayAchiev']]),
      pctToday: parsePct(row[mapping['pctToday']]),
      totalPresent: parsePct(row[mapping['totalPresent']]),
      pctTotal: parsePct(row[mapping['pctTotal']]),
      pctProject: parsePct(row[mapping['pctProject']]),
      targetDate: row[mapping['targetDate']] ? String(row[mapping['targetDate']]) : null,
      availDays: Math.round(parsePct(row[mapping['availDays']])),
      reqRate: parsePct(row[mapping['reqRate']]),
      reqManpower: Math.round(parsePct(row[mapping['reqManpower']])),
      personsDay: Math.round(parsePct(row[mapping['personsDay']])),
    }))

  return NextResponse.json({ headers, mapping, activities })
}
