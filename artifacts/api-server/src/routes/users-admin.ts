import { Router, type IRouter } from "express";
import { db, appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, hashPassword } from "../lib/auth";

const PASSWORD_RULES = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres";
  if (!/[A-Z]/.test(password)) return "A senha deve conter pelo menos uma letra maiúscula";
  if (!/\d/.test(password)) return "A senha deve conter pelo menos um número";
  return null;
}

const router: IRouter = Router();

router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select({
    id: appUsersTable.id,
    username: appUsersTable.username,
    displayName: appUsersTable.displayName,
    role: appUsersTable.role,
    permissions: appUsersTable.permissions,
    createdAt: appUsersTable.createdAt,
  }).from(appUsersTable).orderBy(appUsersTable.id);
  res.json(users);
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { username, password, displayName, role, permissions } = req.body;
  if (!username || !password || !displayName) {
    res.status(400).json({ error: "username, password e displayName são obrigatórios" });
    return;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    res.status(422).json({ error: pwError });
    return;
  }

  const existing = await db.select().from(appUsersTable).where(eq(appUsersTable.username, username));
  if (existing.length > 0) {
    res.status(409).json({ error: "Usuário já existe" });
    return;
  }

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(appUsersTable).values({
    username,
    passwordHash,
    displayName,
    role: role ?? "user",
    permissions: permissions ?? "",
  }).returning({
    id: appUsersTable.id,
    username: appUsersTable.username,
    displayName: appUsersTable.displayName,
    role: appUsersTable.role,
    permissions: appUsersTable.permissions,
  });

  res.status(201).json(user);
});

router.put("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"]!);
  const { password, displayName, role, permissions } = req.body;

  if (password) {
    const pwError = validatePassword(password);
    if (pwError) {
      res.status(422).json({ error: pwError });
      return;
    }
  }

  const updates: Partial<typeof appUsersTable.$inferInsert> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (password) updates.passwordHash = hashPassword(password);

  await db.update(appUsersTable).set(updates).where(eq(appUsersTable.id, id));

  const [user] = await db.select({
    id: appUsersTable.id,
    username: appUsersTable.username,
    displayName: appUsersTable.displayName,
    role: appUsersTable.role,
    permissions: appUsersTable.permissions,
  }).from(appUsersTable).where(eq(appUsersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(user);
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"]!);
  if (req.session.userId === id) {
    res.status(400).json({ error: "Você não pode excluir sua própria conta" });
    return;
  }
  await db.delete(appUsersTable).where(eq(appUsersTable.id, id));
  res.json({ ok: true });
});

export default router;
