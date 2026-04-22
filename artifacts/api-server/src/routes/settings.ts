import { Router, type IRouter } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(appSettingsTable);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value ?? "";
  }
  res.json(settings);
});

router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const updates: Record<string, string> = req.body;
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    if (existing.length > 0) {
      await db.update(appSettingsTable).set({ value }).where(eq(appSettingsTable.key, key));
    } else {
      await db.insert(appSettingsTable).values({ key, value });
    }
  }
  const rows = await db.select().from(appSettingsTable);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value ?? "";
  }
  res.json(result);
});

export default router;
