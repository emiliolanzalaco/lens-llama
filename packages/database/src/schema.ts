import { pgTable, text, timestamp, varchar, bigint, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  address: varchar('address', { length: 42 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  hash: varchar('hash', { length: 66 }).notNull().unique(),
  from: varchar('from', { length: 42 }).notNull(),
  to: varchar('to', { length: 42 }),
  value: bigint('value', { mode: 'bigint' }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  settled: boolean('settled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  settledAt: timestamp('settled_at'),
});
