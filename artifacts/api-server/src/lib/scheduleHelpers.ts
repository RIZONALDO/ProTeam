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

export function detectConflicts(schedules: Array<{
  date: string;
  mainDuoId: number | null;
  sideDuoId: number | null;
  offDuoId: number | null;
}>, duos?: Array<{ id: number; name: string }>) {
  const conflicts: Array<{
    date: string;
    type: string;
    description: string;
    duoId: number | null;
    duoName: string | null;
  }> = [];

  const duoMap = new Map<number, string>();
  if (duos) {
    for (const d of duos) duoMap.set(d.id, d.name);
  }

  const sortedSchedules = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < sortedSchedules.length; i++) {
    const schedule = sortedSchedules[i];

    // Check for duplicate assignment (same duo in multiple roles)
    const assignedDuos = [schedule.mainDuoId, schedule.sideDuoId, schedule.offDuoId].filter(Boolean) as number[];
    const uniqueDuos = new Set(assignedDuos);
    if (assignedDuos.length > uniqueDuos.size) {
      conflicts.push({
        date: schedule.date,
        type: "duplicate_assignment",
        description: "A mesma dupla está em mais de um papel neste dia",
        duoId: null,
        duoName: null,
      });
    }

    // Check side duo rest rule: side duo must not have been side in previous day
    if (schedule.sideDuoId && i > 0) {
      const prevSchedule = sortedSchedules[i - 1];
      const prevDate = new Date(prevSchedule.date + "T00:00:00Z");
      const currDate = new Date(schedule.date + "T00:00:00Z");
      const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1 && prevSchedule.sideDuoId === schedule.sideDuoId) {
        conflicts.push({
          date: schedule.date,
          type: "side_no_rest",
          description: `Dupla lateral sem descanso`,
          duoId: schedule.sideDuoId,
          duoName: duoMap.get(schedule.sideDuoId) ?? null,
        });
      }
    }
  }

  return conflicts;
}
