import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const producersTable = pgTable("producers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProducerSchema = createInsertSchema(producersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProducer = z.infer<typeof insertProducerSchema>;
export type Producer = typeof producersTable.$inferSelect;
