import { Router, type IRouter } from "express";
import { db, appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword } from "../lib/auth";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Usuário e senha obrigatórios" });
    return;
  }

  const [user] = await db.select().from(appUsersTable).where(eq(appUsersTable.username, username));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Usuário ou senha inválidos" });
    return;
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.displayName = user.displayName;
  req.session.userRole = user.role;
  req.session.permissions = user.permissions;
  req.session.mustChangePassword = user.mustChangePassword;

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    permissions: user.permissions,
    mustChangePassword: user.mustChangePassword,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    displayName: req.session.displayName,
    role: req.session.userRole,
    permissions: req.session.permissions,
    mustChangePassword: req.session.mustChangePassword ?? false,
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(422).json({ error: "A nova senha deve ter pelo menos 8 caracteres" });
    return;
  }
  if (!/[A-Z]/.test(newPassword)) {
    res.status(422).json({ error: "A nova senha deve conter pelo menos uma letra maiúscula" });
    return;
  }
  if (!/\d/.test(newPassword)) {
    res.status(422).json({ error: "A nova senha deve conter pelo menos um número" });
    return;
  }

  const [user] = await db.select().from(appUsersTable).where(eq(appUsersTable.id, userId));
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    res.status(401).json({ error: "Senha atual incorreta" });
    return;
  }

  if (currentPassword === newPassword) {
    res.status(422).json({ error: "A nova senha deve ser diferente da senha atual" });
    return;
  }

  await db.update(appUsersTable)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false })
    .where(eq(appUsersTable.id, userId));

  req.session.mustChangePassword = false;

  res.json({ ok: true });
});

export default router;
