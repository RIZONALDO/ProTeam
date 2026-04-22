import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, schedulesTable, producerWeeksTable, membersTable, changeLogsTable } from "@workspace/db";
import {
  CreateScheduleBody,
  UpdateScheduleBody,
  GetScheduleParams,
  UpdateScheduleParams,
  DeleteScheduleParams,
  GetScheduleByDateParams,
  BulkUpdateSchedulesBody,
  ListSchedulesQueryParams,
  ListProducerWeeksQueryParams,
  CreateProducerWeekBody,
  UpdateProducerWeekParams,
  UpdateProducerWeekBody,
  DeleteProducerWeekParams,
  ListSchedulesResponse,
  GetScheduleResponse,
  UpdateScheduleResponse,
  GetScheduleByDateResponse,
  BulkUpdateSchedulesResponse,
  ListProducerWeeksResponse,
  UpdateProducerWeekResponse,
} from "@workspace/api-zod";
import { buildScheduleWithRelations, getMonthDateRange } from "../lib/scheduleHelpers";
import { formatRow, formatRows } from "../lib/formatters";

const router: IRouter = Router();

async function buildProducerWeekWithMember(pw: typeof producerWeeksTable.$inferSelect) {
  const member = pw.memberId
    ? (await db.select().from(membersTable).where(eq(membersTable.id, pw.memberId)))[0] ?? null
    : null;
  return formatRow({ ...pw, member: member ? formatRow(member) : null });
}

// Schedules
router.get("/schedules", async (req, res): Promise<void> => {
  const params = ListSchedulesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let rows;
  if (params.data.year && params.data.month) {
    const { startDate, endDate } = getMonthDateRange(params.data.year, params.data.month);
    rows = await db.select().from(schedulesTable)
      .where(and(gte(schedulesTable.date, startDate), lte(schedulesTable.date, endDate)))
      .orderBy(schedulesTable.date);
  } else if (params.data.year) {
    const startDate = `${params.data.year}-01-01`;
    const endDate = `${params.data.year}-12-31`;
    rows = await db.select().from(schedulesTable)
      .where(and(gte(schedulesTable.date, startDate), lte(schedulesTable.date, endDate)))
      .orderBy(schedulesTable.date);
  } else {
    rows = await db.select().from(schedulesTable).orderBy(schedulesTable.date);
  }

  const withRelations = await Promise.all(rows.map(buildScheduleWithRelations));
  res.json(ListSchedulesResponse.parse(withRelations));
});

router.post("/schedules", async (req, res): Promise<void> => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(schedulesTable).where(eq(schedulesTable.date, parsed.data.date));
  if (existing) {
    res.status(409).json({ error: "Schedule already exists for this date" });
    return;
  }

  const [schedule] = await db.insert(schedulesTable).values(parsed.data).returning();
  const withRelations = await buildScheduleWithRelations(schedule);
  res.status(201).json(GetScheduleResponse.parse(withRelations));
});

router.post("/schedules/bulk-update", async (req, res): Promise<void> => {
  const parsed = BulkUpdateSchedulesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const results = await Promise.all(parsed.data.schedules.map(async (s) => {
    const [existing] = await db.select().from(schedulesTable).where(eq(schedulesTable.date, s.date));
    if (existing) {
      await db.insert(changeLogsTable).values({
        scheduleId: existing.id,
        date: existing.date,
        action: "bulk-update",
        previousState: JSON.stringify({ mainDuoId: existing.mainDuoId, sideDuoId: existing.sideDuoId, offDuoId: existing.offDuoId }),
        newState: JSON.stringify(s),
      });
      const [updated] = await db.update(schedulesTable)
        .set({ ...s, updatedAt: new Date() })
        .where(eq(schedulesTable.id, existing.id))
        .returning();
      return buildScheduleWithRelations(updated);
    } else {
      const [created] = await db.insert(schedulesTable).values(s).returning();
      return buildScheduleWithRelations(created);
    }
  }));

  res.json(BulkUpdateSchedulesResponse.parse(results));
});

router.get("/schedules/by-date/:date", async (req, res): Promise<void> => {
  const params = GetScheduleByDateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.date, params.data.date));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const withRelations = await buildScheduleWithRelations(schedule);
  res.json(GetScheduleByDateResponse.parse(withRelations));
});

router.get("/schedules/:id", async (req, res): Promise<void> => {
  const params = GetScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, params.data.id));
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const withRelations = await buildScheduleWithRelations(schedule);
  res.json(GetScheduleResponse.parse(withRelations));
});

router.patch("/schedules/:id", async (req, res): Promise<void> => {
  const params = UpdateScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  await db.insert(changeLogsTable).values({
    scheduleId: existing.id,
    date: existing.date,
    action: "update",
    previousState: JSON.stringify({ mainDuoId: existing.mainDuoId, sideDuoId: existing.sideDuoId, offDuoId: existing.offDuoId }),
    newState: JSON.stringify(parsed.data),
  });

  const [schedule] = await db.update(schedulesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schedulesTable.id, params.data.id))
    .returning();

  const withRelations = await buildScheduleWithRelations(schedule);
  res.json(UpdateScheduleResponse.parse(withRelations));
});

router.delete("/schedules/:id", async (req, res): Promise<void> => {
  const params = DeleteScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [schedule] = await db.delete(schedulesTable).where(eq(schedulesTable.id, params.data.id)).returning();
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.sendStatus(204);
});

// Producer Weeks
router.get("/producer-weeks", async (req, res): Promise<void> => {
  const params = ListProducerWeeksQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db.select().from(producerWeeksTable).orderBy(producerWeeksTable.weekStart);
  const withMembers = await Promise.all(rows.map(buildProducerWeekWithMember));
  res.json(ListProducerWeeksResponse.parse(withMembers));
});

router.post("/producer-weeks", async (req, res): Promise<void> => {
  const parsed = CreateProducerWeekBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(producerWeeksTable).where(eq(producerWeeksTable.weekStart, parsed.data.weekStart));
  let pw;
  if (existing) {
    const [updated] = await db.update(producerWeeksTable)
      .set({ memberId: parsed.data.memberId ?? null, updatedAt: new Date() })
      .where(eq(producerWeeksTable.id, existing.id))
      .returning();
    pw = updated;
  } else {
    const [created] = await db.insert(producerWeeksTable).values(parsed.data).returning();
    pw = created;
  }

  const result = await buildProducerWeekWithMember(pw);
  res.status(201).json(result);
});

router.patch("/producer-weeks/:id", async (req, res): Promise<void> => {
  const params = UpdateProducerWeekParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProducerWeekBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pw] = await db.update(producerWeeksTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(producerWeeksTable.id, params.data.id))
    .returning();

  if (!pw) {
    res.status(404).json({ error: "Producer week not found" });
    return;
  }

  const result = await buildProducerWeekWithMember(pw);
  res.json(UpdateProducerWeekResponse.parse(result));
});

router.delete("/producer-weeks/:id", async (req, res): Promise<void> => {
  const params = DeleteProducerWeekParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pw] = await db.delete(producerWeeksTable).where(eq(producerWeeksTable.id, params.data.id)).returning();
  if (!pw) {
    res.status(404).json({ error: "Producer week not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
