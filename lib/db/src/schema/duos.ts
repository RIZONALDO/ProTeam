import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const duosTable = pgTable("duos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const duoMembersTable = pgTable("duo_members", {
  id: serial("id").primaryKey(),
  duoId: integer("duo_id").notNull().references(() => duosTable.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
});

export const insertDuoSchema = createInsertSchema(duosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDuo = z.infer<typeof insertDuoSchema>;
export type Duo = typeof duosTable.$inferSelect;
export type DuoMember = typeof duoMembersTable.$inferSelect;
