import { pgTable, serial, varchar, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'head_ga', 'head_os', 'user']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
export const historyStatusEnum = pgEnum('history_status', ['submitted', 'approved', 'rejected']);

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 20 }),
  department: varchar('department', { length: 100 }),
  role: roleEnum('role').notNull().default('user'),
  isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = inactive (soft delete)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Departments Table
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = inactive (soft delete)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Rooms Table
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  capacity: integer('capacity').notNull(),
  location: varchar('location', { length: 255 }),
  isHybrid: integer('is_hybrid').notNull().default(0), // 0 = tidak hybrid, 1 = hybrid
  description: text('description'),
  isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Facilities Table
export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Room Facilities (Many-to-Many)
export const roomFacilities = pgTable('room_facilities', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  facilityId: integer('facility_id').notNull().references(() => facilities.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Meeting Requests Table
export const meetingRequests = pgTable('meeting_requests', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 50 }).notNull().unique(), // MTG-1, MTG-2, etc.
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  nama: varchar('nama', { length: 255 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 20 }).notNull(),
  department: varchar('department', { length: 100 }).notNull(),
  tanggal: varchar('tanggal', { length: 10 }).notNull(), // YYYY-MM-DD
  hari: varchar('hari', { length: 20 }).notNull(),
  jamMulai: varchar('jam_mulai', { length: 5 }).notNull(), // HH:MM
  jamBerakhir: varchar('jam_berakhir', { length: 5 }).notNull(), // HH:MM
  jumlahPeserta: integer('jumlah_peserta').notNull(),
  agenda: text('agenda').notNull(),
  namaRuangan: varchar('nama_ruangan', { length: 100 }).notNull(),
  fasilitas: text('fasilitas').notNull(),
  headGA: approvalStatusEnum('head_ga').notNull().default('pending'),
  headOS: approvalStatusEnum('head_os').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Meeting Request History Table
export const meetingRequestHistory = pgTable('meeting_request_history', {
  id: serial('id').primaryKey(),
  meetingRequestId: integer('meeting_request_id').notNull().references(() => meetingRequests.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  by: varchar('by', { length: 255 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 20 }),
  status: historyStatusEnum('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// API Logs Table - untuk mencatat semua request yang masuk
export const apiLogs = pgTable('api_logs', {
  id: serial('id').primaryKey(),
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, PUT, DELETE, etc.
  path: varchar('path', { length: 500 }).notNull(),
  statusCode: integer('status_code'),
  requestBody: text('request_body'), // JSON string
  responseBody: text('response_body'), // JSON string (optional, untuk debugging)
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 50 }),
  userId: integer('user_id'), // optional, jika user terautentikasi
  duration: integer('duration'), // response time in ms
  errorMessage: text('error_message'), // jika ada error
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  meetingRequests: many(meetingRequests),
}));

export const meetingRequestsRelations = relations(meetingRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [meetingRequests.userId],
    references: [users.id],
  }),
  history: many(meetingRequestHistory),
}));

export const meetingRequestHistoryRelations = relations(meetingRequestHistory, ({ one }) => ({
  meetingRequest: one(meetingRequests, {
    fields: [meetingRequestHistory.meetingRequestId],
    references: [meetingRequests.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  roomFacilities: many(roomFacilities),
}));

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  roomFacilities: many(roomFacilities),
}));

export const roomFacilitiesRelations = relations(roomFacilities, ({ one }) => ({
  room: one(rooms, {
    fields: [roomFacilities.roomId],
    references: [rooms.id],
  }),
  facility: one(facilities, {
    fields: [roomFacilities.facilityId],
    references: [facilities.id],
  }),
}));
