import { pgTable, serial, varchar, timestamp, integer, doublePrecision, boolean, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().$type<"admin" | "user">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  itemDescription: varchar("item_description", { length: 255 }).notNull().unique(),
  uph: integer("uph").notNull(),
  xaTime: doublePrecision("xa_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export const lines = pgTable("lines", {
  id: serial("id").primaryKey(),
  lineName: varchar("line_name", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Line = typeof lines.$inferSelect;
export type NewLine = typeof lines.$inferInsert;

export const assemblyReports = pgTable("assembly_reports", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  lineId: integer("line_id").notNull().references(() => lines.id),
  mo: varchar("mo", { length: 100 }).notNull(),
  itemId: integer("item_id").notNull().references(() => items.id),
  qtyMo: integer("qty_mo").notNull(),
  actualQty: integer("actual_qty").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("end_time", { length: 5 }).notNull(),     // HH:MM
  headCount: integer("head_count").notNull(),
  leader: varchar("leader", { length: 100 }).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AssemblyReport = typeof assemblyReports.$inferSelect;
export type NewAssemblyReport = typeof assemblyReports.$inferInsert;

export const packingReports = pgTable("packing_reports", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  itemId: integer("item_id").notNull().references(() => items.id),
  mo: varchar("mo", { length: 100 }).notNull(),
  qtyMo: integer("qty_mo").notNull(),
  packedQty: integer("packed_qty").notNull(),
  leader: varchar("leader", { length: 100 }).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PackingReport = typeof packingReports.$inferSelect;
export type NewPackingReport = typeof packingReports.$inferInsert;

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pagePath: varchar("page_path", { length: 100 }).notNull(),
  canView: boolean("can_view").default(false).notNull(),
  canCreate: boolean("can_create").default(false).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  canImport: boolean("can_import").default(false).notNull(),
  canExport: boolean("can_export").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("user_page_uniq").on(t.userId, t.pagePath)
]);

export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;

