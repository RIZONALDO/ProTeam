import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, producersTable } from "@workspace/db";
import {
  CreateProducerBody,
  UpdateProducerBody,
  GetProducerParams,
  UpdateProducerParams,
  DeleteProducerParams,
  ListProducersResponse,
  GetProducerResponse,
  UpdateProducerResponse,
} from "@workspace/api-zod";
import { formatRow, formatRows } from "../lib/formatters";

const router: IRouter = Router();

router.get("/producers", async (_req, res): Promise<void> => {
  const producers = await db.select().from(producersTable).orderBy(producersTable.name);
  res.json(ListProducersResponse.parse(formatRows(producers)));
});

router.post("/producers", async (req, res): Promise<void> => {
  const parsed = CreateProducerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [producer] = await db.insert(producersTable).values(parsed.data).returning();
  res.status(201).json(GetProducerResponse.parse(formatRow(producer)));
});

router.get("/producers/:id", async (req, res): Promise<void> => {
  const params = GetProducerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [producer] = await db.select().from(producersTable).where(eq(producersTable.id, params.data.id));
  if (!producer) {
    res.status(404).json({ error: "Producer not found" });
    return;
  }
  res.json(GetProducerResponse.parse(formatRow(producer)));
});

router.patch("/producers/:id", async (req, res): Promise<void> => {
  const params = UpdateProducerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProducerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [producer] = await db.update(producersTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(producersTable.id, params.data.id)).returning();
  if (!producer) {
    res.status(404).json({ error: "Producer not found" });
    return;
  }
  res.json(UpdateProducerResponse.parse(formatRow(producer)));
});

router.delete("/producers/:id", async (req, res): Promise<void> => {
  const params = DeleteProducerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [producer] = await db.delete(producersTable).where(eq(producersTable.id, params.data.id)).returning();
  if (!producer) {
    res.status(404).json({ error: "Producer not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
