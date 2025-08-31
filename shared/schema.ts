import { z } from "zod";
import { pgTable, text, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Drizzle table definitions
export const foldersTable = pgTable("folders", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  parentId: varchar("parent_id"),
  userId: varchar("user_id").notNull(), // Associate folders with users
  createdAt: timestamp("created_at").defaultNow(),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false)
});

export const filesTable = pgTable("files", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  originalName: text("original_name").notNull(),
  displayName: text("display_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  tags: text("tags").array().notNull().default([]),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  userId: varchar("user_id").notNull(), // Associate files with users
  folderId: varchar("folder_id").references(() => foldersTable.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  metadata: jsonb("metadata").notNull().default({})
});

// Types derived from schema
export type File = typeof filesTable.$inferSelect;
export type Folder = typeof foldersTable.$inferSelect;

// Insert schemas
export const insertFileSchema = createInsertSchema(filesTable).omit({
  id: true,
  uploadedAt: true
});

export const insertFolderSchema = createInsertSchema(foldersTable).omit({
  id: true,
  createdAt: true
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
