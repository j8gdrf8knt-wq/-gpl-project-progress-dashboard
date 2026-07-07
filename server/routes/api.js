const express = require('express');
const prisma = require('../lib/db');
const { toJSONSafe } = require('../lib/serialize');
const { requireLoginJson, requirePermissionJson } = require('../middleware/auth');

const router = express.Router();

// ── Activity summaries (fixes the Django N+1: one grouped query per project instead
// of one query per activity) ────────────────────────────────────────────────────
async function activitySummariesForProject(projectId, reportDate) {
  const [today, present, starts] = await Promise.all([
    prisma.dailyLogEntry.groupBy({
      by: ['activityId'],
      where: { projectId, date: reportDate || '' },
      _sum: { qtyDone: true },
    }),
    prisma.dailyLogEntry.groupBy({
      by: ['activityId'],
      where: { projectId, date: { lte: reportDate || '' } },
      _sum: { qtyDone: true },
    }),
    prisma.dailyLogEntry.groupBy({
      by: ['activityId'],
      where: { projectId },
      _min: { date: true },
    }),
  ]);

  const todayMap = new Map(today.map((r) => [r.activityId.toString(), r._sum.qtyDone || 0]));
  const presentMap = new Map(present.map((r) => [r.activityId.toString(), r._sum.qtyDone || 0]));
  const startMap = new Map(starts.map((r) => [r.activityId.toString(), r._min.date]));

  return (activityId) => ({
    todayAchiev: todayMap.get(activityId.toString()) || 0,
    totalPresent: presentMap.get(activityId.toString()) || 0,
    startDate: startMap.get(activityId.toString()) || null,
  });
}

// GET /api/projects/
router.get('/projects', requireLoginJson, async (req, res) => {
  const projects = await prisma.project.findMany({
    include: {
      activities: { orderBy: { order: 'asc' } },
      areas: { orderBy: { order: 'asc' } },
      logs: { orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] },
      boqItems: { orderBy: { order: 'asc' } },
      expenses: { orderBy: { date: 'desc' } },
    },
  });

  const out = {};
  for (const p of projects) {
    const summaryFor = await activitySummariesForProject(p.id, p.reportDate);
    out[p.id] = {
      id: p.id,
      name: p.name,
      client: p.client,
      startDate: p.startDate,
      targetDate: p.targetDate,
      reportDate: p.reportDate,
      activities: p.activities.map((a) => ({
        id: a.id,
        name: a.name,
        qty: a.qty,
        unit: a.unit,
        weightPct: a.weightPct,
        manDayRate: a.manDayRate,
        ...summaryFor(a.id),
      })),
      areas: p.areas.map((a) => ({ id: a.id, name: a.name })),
      logs: p.logs.map((l) => ({
        id: l.id,
        date: l.date,
        area_id: l.areaId,
        activity_id: l.activityId,
        qty_done: l.qtyDone,
      })),
      items: p.boqItems.map((i) => ({
        sl: i.sl,
        desc: i.desc,
        qty: i.qty,
        unit: i.unit,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        totalCost: i.totalCost,
        offerPrice: i.offerPrice,
      })),
      expenses: p.expenses.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
        remarks: e.remarks,
      })),
    };
  }
  res.json(toJSONSafe(out));
});

// POST /api/projects/save/
// Note: this upserts Activities/Areas by id instead of the Django app's delete-then-recreate
// approach. That original pattern reassigned fresh ids to every Activity/Area on every save,
// which silently orphaned any DailyLogEntry referencing the old ids (a real data-loss bug,
// since logs reference activity/area by id) — upserting keeps those ids stable across saves.
router.post('/projects/save/', requirePermissionJson('project.create'), async (req, res) => {
  const data = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          name: data.name,
          client: data.client || '',
          startDate: data.startDate || '',
          targetDate: data.targetDate || '',
          reportDate: data.reportDate || '',
        },
        update: {
          name: data.name,
          client: data.client || '',
          startDate: data.startDate || '',
          targetDate: data.targetDate || '',
          reportDate: data.reportDate || '',
        },
      });

      // ── Activities: upsert by id, delete ones the client removed ──
      const existingActivities = await tx.activity.findMany({ where: { projectId: project.id }, select: { id: true } });
      const existingActivityIds = new Set(existingActivities.map((a) => a.id.toString()));
      const keepActivityIds = new Set();

      for (const [i, a] of (data.activities || []).entries()) {
        const fields = {
          name: a.name, qty: +a.qty || 0, unit: a.unit || '',
          weightPct: +a.weightPct || 0, manDayRate: +a.manDayRate || 0, order: i,
        };
        if (a.id != null && existingActivityIds.has(String(a.id))) {
          await tx.activity.update({ where: { id: BigInt(a.id) }, data: fields });
          keepActivityIds.add(String(a.id));
        } else {
          const created = await tx.activity.create({ data: { ...fields, projectId: project.id } });
          keepActivityIds.add(created.id.toString());
        }
      }
      const removedActivityIds = [...existingActivityIds].filter((id) => !keepActivityIds.has(id)).map(BigInt);
      if (removedActivityIds.length) {
        await tx.dailyLogEntry.deleteMany({ where: { activityId: { in: removedActivityIds } } });
        await tx.areaActivityQuota.deleteMany({ where: { activityId: { in: removedActivityIds } } });
        await tx.activity.deleteMany({ where: { id: { in: removedActivityIds } } });
      }

      // ── Areas: same upsert-by-id pattern ──
      const existingAreas = await tx.area.findMany({ where: { projectId: project.id }, select: { id: true } });
      const existingAreaIds = new Set(existingAreas.map((a) => a.id.toString()));
      const keepAreaIds = new Set();

      for (const [i, ar] of (data.areas || []).entries()) {
        const fields = { name: ar.name, order: i };
        if (ar.id != null && existingAreaIds.has(String(ar.id))) {
          await tx.area.update({ where: { id: BigInt(ar.id) }, data: fields });
          keepAreaIds.add(String(ar.id));
        } else {
          const created = await tx.area.create({ data: { ...fields, projectId: project.id } });
          keepAreaIds.add(created.id.toString());
        }
      }
      const removedAreaIds = [...existingAreaIds].filter((id) => !keepAreaIds.has(id)).map(BigInt);
      if (removedAreaIds.length) {
        await tx.dailyLogEntry.deleteMany({ where: { areaId: { in: removedAreaIds } } });
        await tx.areaActivityQuota.deleteMany({ where: { areaId: { in: removedAreaIds } } });
        await tx.area.deleteMany({ where: { id: { in: removedAreaIds } } });
      }

      // ── Daily logs: safe to fully replace now that activity/area ids are stable ──
      await tx.dailyLogEntry.deleteMany({ where: { projectId: project.id } });
      const logsToCreate = [];
      for (const log of (data.logs || [])) {
        if (log.area_id == null || log.activity_id == null) continue;
        if (!keepAreaIds.has(String(log.area_id)) || !keepActivityIds.has(String(log.activity_id))) continue;
        logsToCreate.push({
          projectId: project.id,
          date: String(log.date || ''),
          areaId: BigInt(log.area_id),
          activityId: BigInt(log.activity_id),
          qtyDone: +log.qty_done || 0,
          createdAt: new Date(),
        });
      }
      if (logsToCreate.length) await tx.dailyLogEntry.createMany({ data: logsToCreate });

      // ── BOQ items: no id is ever exposed to the client (matches original design),
      // so full delete+recreate is safe here — just detach any expense links first.
      const oldItems = await tx.boqItem.findMany({ where: { projectId: project.id }, select: { id: true } });
      if (oldItems.length) {
        await tx.expenseEntry.updateMany({ where: { boqItemId: { in: oldItems.map((i) => i.id) } }, data: { boqItemId: null } });
        await tx.boqItem.deleteMany({ where: { projectId: project.id } });
      }
      const items = (data.items || []).map((item, i) => ({
        projectId: project.id,
        order: i,
        sl: +item.sl || i + 1,
        desc: item.desc || '',
        qty: +item.qty || 0,
        unit: item.unit || '',
        unitPrice: +item.unitPrice || 0,
        totalPrice: +item.totalPrice || 0,
        totalCost: +item.totalCost || 0,
        offerPrice: +item.offerPrice || 0,
      }));
      if (items.length) await tx.boqItem.createMany({ data: items });
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('save_project failed:', e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/projects/delete/:id/
router.post('/projects/delete/:id/', requirePermissionJson('project.delete'), async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const boqItems = await tx.boqItem.findMany({ where: { projectId: id }, select: { id: true } });
    await tx.expenseEntry.deleteMany({ where: { projectId: id } });
    if (boqItems.length) await tx.boqItem.deleteMany({ where: { projectId: id } });
    await tx.dailyLogEntry.deleteMany({ where: { projectId: id } });
    await tx.areaActivityQuota.deleteMany({ where: { activity: { projectId: id } } });
    await tx.activity.deleteMany({ where: { projectId: id } });
    await tx.area.deleteMany({ where: { projectId: id } });
    await tx.project.deleteMany({ where: { id } });
  });
  res.json({ ok: true });
});

// GET /api/projects/:id/expenses/
router.get('/projects/:id/expenses/', requireLoginJson, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const expenses = await prisma.expenseEntry.findMany({ where: { projectId: project.id }, orderBy: { date: 'desc' } });
  res.json(toJSONSafe({
    expenses,
    total: expenses.reduce((s, e) => s + e.amount, 0),
  }));
});

// POST /api/projects/:id/expenses/save/
router.post('/projects/:id/expenses/save/', requirePermissionJson('expense.create'), async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const data = req.body;
  try {
    const expense = await prisma.expenseEntry.create({
      data: {
        projectId: project.id,
        date: data.date || '',
        category: data.category || '',
        description: data.description || '',
        amount: +data.amount || 0,
        remarks: data.remarks || '',
        ...(data.boqItemId ? { boqItemId: BigInt(data.boqItemId) } : {}),
      },
    });
    res.json(toJSONSafe({
      id: expense.id, date: expense.date, category: expense.category,
      description: expense.description, amount: expense.amount,
    }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/projects/:id/expenses/:expenseId/update/
router.put('/projects/:id/expenses/:expenseId/update/', requirePermissionJson('expense.update'), async (req, res) => {
  const { id, expenseId } = req.params;
  const existing = await prisma.expenseEntry.findFirst({ where: { id: BigInt(expenseId), projectId: id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const data = req.body;
  try {
    await prisma.expenseEntry.update({
      where: { id: existing.id },
      data: {
        date: data.date ?? existing.date,
        category: data.category ?? existing.category,
        description: data.description ?? existing.description,
        amount: data.amount != null ? +data.amount : existing.amount,
        remarks: data.remarks ?? existing.remarks,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/projects/:id/expenses/:expenseId/delete/
router.delete('/projects/:id/expenses/:expenseId/delete/', requirePermissionJson('expense.delete'), async (req, res) => {
  const { id, expenseId } = req.params;
  const existing = await prisma.expenseEntry.findFirst({ where: { id: BigInt(expenseId), projectId: id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.expenseEntry.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

// POST /api/projects/:id/expenses/bulk/
router.post('/projects/:id/expenses/bulk/', requirePermissionJson('expense.create'), async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const expensesData = req.body.expenses || [];
  const toCreate = [];
  const errors = [];

  expensesData.forEach((exp, idx) => {
    const amount = +exp.amount;
    if (Number.isNaN(amount)) {
      errors.push({ row: idx + 1, error: 'Invalid amount' });
      return;
    }
    toCreate.push({
      projectId: project.id,
      date: exp.date || '',
      category: exp.category || '',
      description: exp.description || '',
      amount,
      remarks: exp.remarks || '',
    });
  });

  if (toCreate.length) await prisma.expenseEntry.createMany({ data: toCreate });
  res.json({ created: toCreate.length, errors });
});

module.exports = router;
