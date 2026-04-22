import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, dayMemberOverridesTable, membersTable, duosTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function enrichOverride(row: typeof dayMemberOverridesTable.$inferSelect) {
  const [replaced, substitute, duo] = await Promise.all([
    db.select({ id: membersTable.id, name: membersTable.name }).from(membersTable).where(eq(membersTable.id, row.replacedMemberId)).then((r) => r[0] ?? null),
    db.select({ id: membersTable.id, name: membersTable.name }).from(membersTable).where(eq(membersTable.id, row.substituteMemberId)).then((r) => r[0] ?? null),
    db.select({ id: duosTable.id, name: duosTable.name }).from(duosTable).where(eq(duosTable.id, row.duoId)).then((r) => r[0] ?? null),
  ]);
  return {
    id: row.id,
    date: row.date,
    duoId: row.duoId,
    duo,
    replacedMemberId: row.replacedMemberId,
    replacedMember: replaced,
    substituteMemberId: row.substituteMemberId,
    substituteMember: substitute,
    reason: row.reason ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/day-overrides", requireAuth, async (req, res): Promise<void> => {
  const { year, month, date } = req.query as Record<string, string | undefined>;

  let rows: (typeof dayMemberOverridesTable.$inferSelect)[];

  if (date) {
    rows = await db.select().from(dayMemberOverridesTable).where(eq(dayMemberOverridesTable.date, date));
  } else if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const startDate = `${y}-${pad(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${pad(m)}-${pad(lastDay)}`;
    rows = await db.select().from(dayMemberOverridesTable)
      .where(and(gte(dayMemberOverridesTable.date, startDate), lte(dayMemberOverridesTable.date, endDate)));
  } else {
    rows = await db.select().from(dayMemberOverridesTable);
  }

  const enriched = await Promise.all(rows.map(enrichOverride));
  res.json(enriched);
});

router.post("/day-overrides", requireAuth, async (req, res): Promise<void> => {
  const { date, duoId, replacedMemberId, substituteMemberId, reason } = req.body ?? {};

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Data inválida" });
    return;
  }
  if (!duoId || !replacedMemberId || !substituteMemberId) {
    res.status(400).json({ error: "Campos obrigatórios faltando" });
    return;
  }

  const existing = await db.select().from(dayMemberOverridesTable)
    .where(and(
      eq(dayMemberOverridesTable.date, date),
      eq(dayMemberOverridesTable.duoId, Number(duoId)),
      eq(dayMemberOverridesTable.replacedMemberId, Number(replacedMemberId)),
    ))
    .then((r) => r[0] ?? null);

  let row: typeof dayMemberOverridesTable.$inferSelect;

  if (existing) {
    const updated = await db.update(dayMemberOverridesTable)
      .set({ substituteMemberId: Number(substituteMemberId), reason: reason ?? null })
      .where(eq(dayMemberOverridesTable.id, existing.id))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db.insert(dayMemberOverridesTable)
      .values({
        date,
        duoId: Number(duoId),
        replacedMemberId: Number(replacedMemberId),
        substituteMemberId: Number(substituteMemberId),
        reason: reason ?? null,
      })
      .returning();
    row = inserted[0];
  }

  const enriched = await enrichOverride(row);
  res.json(enriched);
});

router.delete("/day-overrides/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  await db.delete(dayMemberOverridesTable).where(eq(dayMemberOverridesTable.id, id));
  res.json({ ok: true });
});

export default router;
