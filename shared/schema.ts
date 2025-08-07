import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Chat rooms table
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  password: varchar("password").notNull(),
  creatorId: varchar("creator_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  lastActivityAt: timestamp("last_activity_at").default(sql`now()`).notNull(),
  participantCount: text("participant_count").default("0").notNull(),
});

// Messages table  
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id"),
  senderNickname: varchar("sender_nickname").default("Anonymous"),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").default(sql`now()`).notNull(),
});

// Zod schemas for validation
export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  createdAt: true,
  lastActivityAt: true,
});

export const joinRoomSchema = z.object({
  roomId: z.string(),
  password: z.string(),
  nickname: z.string().min(1).max(50)
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

// TypeScript types
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type JoinRoom = z.infer<typeof joinRoomSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Client-side message type for real-time updates
export type ClientMessage = {
  id: string;
  content: string;
  senderNickname: string;
  senderId?: string;
  timestamp: Date;
  isOwn?: boolean;
  readBy?: string[];
  deliveredTo?: string[];
};

// Room participant type for session management
export type Participant = {
  id: string;
  nickname: string;
  socketId: string;
  joinedAt: Date;
};
