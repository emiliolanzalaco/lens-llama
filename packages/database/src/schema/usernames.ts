import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { images } from './images';

export const usernames = pgTable(
  'usernames',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userAddress: varchar('user_address', { length: 42 }).notNull().unique(),
    username: varchar('username', { length: 63 }).notNull().unique(), // DNS label limit
    ensName: varchar('ens_name', { length: 255 }).notNull().unique(), // e.g., "alice.ens.eth"
    claimedAt: timestamp('claimed_at').notNull().defaultNow(),
    firstImageId: uuid('first_image_id').references(() => images.id),
  },
  (table) => ({
    userAddressIdx: index('username_user_address_idx').on(table.userAddress),
    usernameIdx: index('username_idx').on(table.username),
  })
);

export type Username = typeof usernames.$inferSelect;
export type NewUsername = typeof usernames.$inferInsert;
