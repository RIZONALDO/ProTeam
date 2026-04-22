import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { duosTable } from "./duos";
import { membersTable } from "./members";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  mainDuoId: integer("main_duo_id").references(() => duosTable.id, { onDelete: "set null" }),
  sideDuoId: integer("side_duo_id").references(() => duosTable.id, { onDelete: "set null" }),
  offDuoId: integer("off_duo_id").references(() => duosTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const producerWeeksTable = pgTable("producer_weeks", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull().unique(),
  memberId: integer("member_id").references(() => membersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const changeLogsTable = pgTable("change_logs", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id"),
  date: text("date").notNull(),
  action: text("action").notNull(),
  previousState: text("previous_state"),
  newState: text("new_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProducerWeekSchema = createInsertSchema(producerWeeksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChangeLogSchema = createInsertSchema(changeLogsTable).omit({ id: true, createdAt: true });

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
export type InsertProducerWeek = z.infer<typeof insertProducerWeekSchema>;
export type ProducerWeek = typeof producerWeeksTable.$inferSelect;
export type ChangeLog = typeof changeLogsTable.$inferSelect;
