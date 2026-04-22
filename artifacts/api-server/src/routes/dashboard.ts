import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, schedulesTable, producerWeeksTable, producersTable, duosTable, changeLogsTable } from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  ListConflictsQueryParams,
  GetDuoStatsQueryParams,
  GetProducerStatsQueryParams,
  GetChangeHistoryQueryParams,
  GetDashboardSummaryResponse,
  ListConflictsResponse,
  GetDuoStatsResponse,
  GetProducerStatsResponse,
  GetChangeHistoryResponse,
} from "@workspace/api-zod";
import { buildScheduleWithRelations, getMonthDateRange, detectConflicts } from "../lib/scheduleHelpers";
import { getAllDuosWithMembers } from "./duos";
import { formatRow, formatRows } from "../lib/formatters";

const router: IRouter = Router();

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const params = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const referenceDate = params.data.date ? new Date(params.data.date + "T00:00:00Z") : new Date();
  const weekStart = getMondayOfWeek(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  // Get producer for this week
  const [producerWeekRow] = await db.select().from(producerWeeksTable)
    .where(eq(producerWeeksTable.weekStart, weekStartStr));

  let currentProducer: Record<string, unknown> | null = null;
  if (producerWeekRow?.producerId) {
    const [producer] = await db.select().from(producersTable)
      .where(eq(producersTable.id, producerWeekRow.producerId));
    currentProducer = producer ? formatRow(producer) : null;
  }

  // Get schedules for this week
  const weekSchedules = await db.select().from(schedulesTable)
    .where(and(gte(schedulesTable.date, weekStartStr), lte(schedulesTable.date, weekEndStr)))
    .orderBy(schedulesTable.date);

  // Get upcoming days with relations
  const upcomingDays = await Promise.all(weekSchedules.map(buildScheduleWithRelations));

  // Conflicts for this week
  const conflicts = detectConflicts(weekSchedules);

  // Duo summary
  const allDuos = await getAllDuosWithMembers();
  const duoSummary = allDuos.map((duo) => {
    const mainDays = weekSchedules.filter((s) => s.mainDuoId === duo.id).length;
    const sideDays = weekSchedules.filter((s) => s.sideDuoId === duo.id).length;
    const offDays = weekSchedules.filter((s) => s.offDuoId === duo.id).length;
    return { duo, mainDays, sideDays, offDays };
  });

  res.json(GetDashboardSummaryResponse.parse({
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    currentProducer: currentProducer,
    scheduleCount: weekSchedules.length,
    conflictsCount: conflicts.length,
    duoSummary,
    upcomingDays,
  }));
});

router.get("/dashboard/conflicts", async (req, res): Promise<void> => {
  const params = ListConflictsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const now = new Date();
  const year = params.data.year ?? now.getUTCFullYear();
  const month = params.data.month ?? now.getUTCMonth() + 1;
  const { startDate, endDate } = getMonthDateRange(year, month);

  const schedules = await db.select().from(schedulesTable)
    .where(and(gte(schedulesTable.date, startDate), lte(schedulesTable.date, endDate)))
    .orderBy(schedulesTable.date);

  const allDuos = await db.select().from(duosTable);
  const conflicts = detectConflicts(schedules, allDuos);

  res.json(ListConflictsResponse.parse(conflicts));
});

// Reports
router.get("/reports/duo-stats", async (req, res): Promise<void> => {
  const params = GetDuoStatsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const now = new Date();
  const year = params.data.year ?? now.getUTCFullYear();

  let schedules;
  if (params.data.month) {
    const { startDate, endDate } = getMonthDateRange(year, params.data.month);
    schedules = await db.select().from(schedulesTable)
      .where(and(gte(schedulesTable.date, startDate), lte(schedulesTable.date, endDate)));
  } else {
    schedules = await db.select().from(schedulesTable)
      .where(and(gte(schedulesTable.date, `${year}-01-01`), lte(schedulesTable.date, `${year}-12-31`)));
  }

  const allDuos = await getAllDuosWithMembers();
  const stats = allDuos.map((duo) => {
    const mainDays = schedules.filter((s) => s.mainDuoId === (duo as { id: number }).id).length;
    const sideDays = schedules.filter((s) => s.sideDuoId === (duo as { id: number }).id).length;
    const offDays = schedules.filter((s) => s.offDuoId === (duo as { id: number }).id).length;
    return { duo, mainDays, sideDays, offDays, totalDays: mainDays + sideDays + offDays };
  });

  res.json(GetDuoStatsResponse.parse(stats));
});

router.get("/reports/producer-stats", async (req, res): Promise<void> => {
  const params = GetProducerStatsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const now = new Date();
  const year = params.data.year ?? now.getUTCFullYear();

  let producerWeeks;
  if (params.data.month) {
    const { startDate, endDate } = getMonthDateRange(year, params.data.month);
    producerWeeks = await db.select().from(producerWeeksTable)
      .where(and(gte(producerWeeksTable.weekStart, startDate), lte(producerWeeksTable.weekStart, endDate)));
  } else {
    producerWeeks = await db.select().from(producerWeeksTable)
      .where(and(gte(producerWeeksTable.weekStart, `${year}-01-01`), lte(producerWeeksTable.weekStart, `${year}-12-31`)));
  }

  const allProducers = await db.select().from(producersTable);
  const stats = allProducers.map((producer) => {
    const weeksResponsible = producerWeeks.filter((pw) => pw.producerId === producer.id).length;
    return { producer: formatRow(producer), weeksResponsible };
  });

  res.json(GetProducerStatsResponse.parse(stats));
});

router.get("/reports/change-history", async (req, res): Promise<void> => {
  const params = GetChangeHistoryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 50;
  const offset = params.data.offset ?? 0;

  const logs = await db.select().from(changeLogsTable)
    .orderBy(changeLogsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json(GetChangeHistoryResponse.parse(formatRows(logs)));
});

export default router;
