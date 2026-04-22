import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, duosTable, duoMembersTable, membersTable } from "@workspace/db";
import {
  CreateDuoBody,
  UpdateDuoBody,
  GetDuoParams,
  UpdateDuoParams,
  DeleteDuoParams,
  ListDuosResponse,
  GetDuoResponse,
  UpdateDuoResponse,
} from "@workspace/api-zod";
import { formatRow, formatRows } from "../lib/formatters";

const router: IRouter = Router();

async function getDuoWithMembers(duoId: number) {
  const [duo] = await db.select().from(duosTable).where(eq(duosTable.id, duoId));
  if (!duo) return null;

  const duoMemberRows = await db.select().from(duoMembersTable).where(eq(duoMembersTable.duoId, duoId));
  const memberIds = duoMemberRows.map((dm) => dm.memberId);
  const members = memberIds.length > 0
    ? await db.select().from(membersTable).where(inArray(membersTable.id, memberIds))
    : [];

  return formatRow({ ...duo, members: members.map(formatRow) });
}

async function getAllDuosWithMembers() {
  const duos = await db.select().from(duosTable).orderBy(duosTable.name);
  const allDuoMembers = await db.select().from(duoMembersTable);
  const allMemberIds = [...new Set(allDuoMembers.map((dm) => dm.memberId))];
  const allMembers = allMemberIds.length > 0
    ? await db.select().from(membersTable).where(inArray(membersTable.id, allMemberIds))
    : [];

  return duos.map((duo) => {
    const duoMemberIds = allDuoMembers.filter((dm) => dm.duoId === duo.id).map((dm) => dm.memberId);
    const members = allMembers.filter((m) => duoMemberIds.includes(m.id));
    return formatRow({ ...duo, members: members.map(formatRow) });
  });
}

router.get("/duos", async (_req, res): Promise<void> => {
  const duos = await getAllDuosWithMembers();
  res.json(ListDuosResponse.parse(duos));
});

router.post("/duos", async (req, res): Promise<void> => {
  const parsed = CreateDuoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { memberIds, ...duoData } = parsed.data;
  const [duo] = await db.insert(duosTable).values(duoData).returning();

  if (memberIds && memberIds.length > 0) {
    await db.insert(duoMembersTable).values(memberIds.map((memberId) => ({ duoId: duo.id, memberId })));
  }

  const result = await getDuoWithMembers(duo.id);
  res.status(201).json(GetDuoResponse.parse(result));
});

router.get("/duos/:id", async (req, res): Promise<void> => {
  const params = GetDuoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getDuoWithMembers(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Duo not found" });
    return;
  }
  res.json(GetDuoResponse.parse(result));
});

router.patch("/duos/:id", async (req, res): Promise<void> => {
  const params = UpdateDuoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDuoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { memberIds, ...duoData } = parsed.data;
  const [duo] = await db.update(duosTable)
    .set({ ...duoData, updatedAt: new Date() })
    .where(eq(duosTable.id, params.data.id))
    .returning();

  if (!duo) {
    res.status(404).json({ error: "Duo not found" });
    return;
  }

  if (memberIds !== undefined) {
    await db.delete(duoMembersTable).where(eq(duoMembersTable.duoId, duo.id));
    if (memberIds.length > 0) {
      await db.insert(duoMembersTable).values(memberIds.map((memberId) => ({ duoId: duo.id, memberId })));
    }
  }

  const result = await getDuoWithMembers(duo.id);
  res.json(UpdateDuoResponse.parse(result));
});

router.delete("/duos/:id", async (req, res): Promise<void> => {
  const params = DeleteDuoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [duo] = await db.delete(duosTable).where(eq(duosTable.id, params.data.id)).returning();
  if (!duo) {
    res.status(404).json({ error: "Duo not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
export { getDuoWithMembers, getAllDuosWithMembers };
