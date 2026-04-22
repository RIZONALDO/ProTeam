import { eq, inArray, and, gte, lte } from "drizzle-orm";
import { db, schedulesTable, producerWeeksTable, producersTable, duosTable, duoMembersTable, membersTable } from "@workspace/db";
import { formatRow } from "./formatters";

export async function getDuoWithMembersById(duoId: number | null | undefined) {
  if (!duoId) return null;
  const [duo] = await db.select().from(duosTable).where(eq(duosTable.id, duoId));
  if (!duo) return null;

  const duoMemberRows = await db.select().from(duoMembersTable).where(eq(duoMembersTable.duoId, duoId));
  const memberIds = duoMemberRows.map((dm) => dm.memberId);
  const members = memberIds.length > 0
    ? await db.select().from(membersTable).where(inArray(membersTable.id, memberIds))
    : [];

  return formatRow({ ...duo, members: members.map(formatRow) });
}

export async function getProducerWeekForDate(date: string) {
  const d = new Date(date + "T00:00:00Z");
  const dayOfWeek = d.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + daysToMonday);
  const weekStart = monday.toISOString().split("T")[0];

  const [pw] = await db.select().from(producerWeeksTable).where(eq(producerWeeksTable.weekStart, weekStart));
  if (!pw) return null;

  const producer = pw.producerId
    ? (await db.select().from(producersTable).where(eq(producersTable.id, pw.producerId)))[0] ?? null
    : null;

  return formatRow({ ...pw, producer: producer ? formatRow(producer) : null });
}

export async function buildScheduleWithRelations(schedule: {
  id: number;
  date: string;
  mainDuoId: number | null;
  sideDuoId: number | null;
  offDuoId: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const [mainDuo, sideDuo, offDuo, producerWeek] = await Promise.all([
    getDuoWithMembersById(schedule.mainDuoId),
    getDuoWithMembersById(schedule.sideDuoId),
    getDuoWithMembersById(schedule.offDuoId),
    getProducerWeekForDate(schedule.date),
  ]);

  return formatRow({
    ...schedule,
    mainDuo: mainDuo ?? null,
    sideDuo: sideDuo ?? null,
    offDuo: offDuo ?? null,
    producerWeek: producerWeek ?? null,
  });
}

export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

export type ConflictItem = {
  date: string;
  type: string;
  description: string;
  severity: "error" | "warning";
  duoId: number | null;
  duoName: string | null;
};

export function detectConflicts(
  schedules: Array<{
    date: string;
    mainDuoId: number | null;
    sideDuoId: number | null;
    offDuoId: number | null;
  }>,
  duos?: Array<{ id: number; name: string }>
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  const duoMap = new Map<number, string>();
  if (duos) {
    for (const d of duos) duoMap.set(d.id, d.name);
  }

  const sortedSchedules = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

  // ── per-day checks ──────────────────────────────────────────────
  for (let i = 0; i < sortedSchedules.length; i++) {
    const s = sortedSchedules[i];

    const assigned = [s.mainDuoId, s.sideDuoId, s.offDuoId].filter((id): id is number => id != null);
    const unique = new Set(assigned);

    // Error: same duo in multiple roles
    if (assigned.length > unique.size) {
      conflicts.push({
        date: s.date,
        type: "duplicate_assignment",
        description: "A mesma dupla está em mais de um papel neste dia",
        severity: "error",
        duoId: null,
        duoName: null,
      });
    }

    // Warning: day has some assignments but is not fully filled
    if (assigned.length > 0 && assigned.length < 3) {
      const missing: string[] = [];
      if (!s.mainDuoId) missing.push("principal");
      if (!s.sideDuoId) missing.push("lateral");
      if (!s.offDuoId) missing.push("folga");
      conflicts.push({
        date: s.date,
        type: "incomplete_day",
        description: `Dia incompleto — sem dupla ${missing.join(" e ")}`,
        severity: "warning",
        duoId: null,
        duoName: null,
      });
    }

    // Error: side duo without rest (worked side the previous consecutive day)
    if (s.sideDuoId && i > 0) {
      const prev = sortedSchedules[i - 1];
      const prevDate = new Date(prev.date + "T00:00:00Z");
      const currDate = new Date(s.date + "T00:00:00Z");
      const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1 && prev.sideDuoId === s.sideDuoId) {
        conflicts.push({
          date: s.date,
          type: "side_no_rest",
          description: `Dupla lateral sem descanso`,
          severity: "error",
          duoId: s.sideDuoId,
          duoName: duoMap.get(s.sideDuoId) ?? null,
        });
      }
    }

    // Warning: same main duo on consecutive days
    if (s.mainDuoId && i > 0) {
      const prev = sortedSchedules[i - 1];
      const prevDate = new Date(prev.date + "T00:00:00Z");
      const currDate = new Date(s.date + "T00:00:00Z");
      const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1 && prev.mainDuoId === s.mainDuoId) {
        conflicts.push({
          date: s.date,
          type: "main_consecutive",
          description: `Dupla principal repetida — reveze para distribuir melhor`,
          severity: "warning",
          duoId: s.mainDuoId,
          duoName: duoMap.get(s.mainDuoId) ?? null,
        });
      }
    }
  }

  // ── weekly off check ────────────────────────────────────────────
  // Group days by ISO week (Mon–Sun) and flag any duo that never rests
  const weekGroups = new Map<string, typeof sortedSchedules>();
  for (const s of sortedSchedules) {
    const d = new Date(s.date + "T00:00:00Z");
    const dow = d.getUTCDay(); // 0=Sun
    const daysToMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() + daysToMon);
    const weekKey = mon.toISOString().split("T")[0]!;
    if (!weekGroups.has(weekKey)) weekGroups.set(weekKey, []);
    weekGroups.get(weekKey)!.push(s);
  }

  for (const [, weekDays] of weekGroups) {
    if (weekDays.length < 7) continue; // incomplete weeks — skip
    const allDuoIds = new Set<number>();
    weekDays.forEach((d) => {
      if (d.mainDuoId) allDuoIds.add(d.mainDuoId);
      if (d.sideDuoId) allDuoIds.add(d.sideDuoId);
      if (d.offDuoId) allDuoIds.add(d.offDuoId);
    });
    for (const duoId of allDuoIds) {
      const hasOff = weekDays.some((d) => d.offDuoId === duoId);
      if (!hasOff) {
        const lastDay = weekDays[weekDays.length - 1]!;
        conflicts.push({
          date: lastDay.date,
          type: "no_weekly_off",
          description: `Sem folga na semana`,
          severity: "warning",
          duoId,
          duoName: duoMap.get(duoId) ?? null,
        });
      }
    }
  }

  // ── workload imbalance across the full period ───────────────────
  if (sortedSchedules.length >= 5) {
    const workCount = new Map<number, number>(); // duoId → working days (main + side)
    for (const s of sortedSchedules) {
      if (s.mainDuoId) workCount.set(s.mainDuoId, (workCount.get(s.mainDuoId) ?? 0) + 1);
      if (s.sideDuoId) workCount.set(s.sideDuoId, (workCount.get(s.sideDuoId) ?? 0) + 1);
    }
    const counts = Array.from(workCount.entries());
    if (counts.length >= 2) {
      const maxEntry = counts.reduce((a, b) => (a[1] >= b[1] ? a : b));
      const minEntry = counts.reduce((a, b) => (a[1] <= b[1] ? a : b));
      const diff = maxEntry[1] - minEntry[1];
      if (diff >= 3) {
        const lastDate = sortedSchedules[sortedSchedules.length - 1]!.date;
        conflicts.push({
          date: lastDate,
          type: "imbalance",
          description: `Desequilíbrio de carga: "${duoMap.get(maxEntry[0]) ?? `Dupla ${maxEntry[0]}`}" trabalha ${diff} dias a mais que "${duoMap.get(minEntry[0]) ?? `Dupla ${minEntry[0]}`}"`,
          severity: "warning",
          duoId: maxEntry[0],
          duoName: duoMap.get(maxEntry[0]) ?? null,
        });
      }
    }
  }

  return conflicts;
}
