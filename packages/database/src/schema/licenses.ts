import { pgTable, uuid, varchar, decimal, text, timestamp, index } from 'drizzle-orm/pg-core';
import { images } from './images';

export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    imageId: uuid('image_id')
      .notNull()
      .references(() => images.id),
    buyerAddress: varchar('buyer_address', { length: 42 }).notNull(),
    photographerAddress: varchar('photographer_address', { length: 42 }).notNull(),
    priceUsdc: decimal('price_usdc', { precision: 10, scale: 2 }).notNull(),
    paymentTxHash: text('payment_tx_hash').notNull(),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
  },
  (table) => ({
    imageIdIdx: index('image_id_idx').on(table.imageId),
    buyerIdx: index('buyer_idx').on(table.buyerAddress),
    buyerImageIdx: index('buyer_image_idx').on(table.buyerAddress, table.imageId),
    photographerIdx: index('license_photographer_idx').on(table.photographerAddress),
  })
);

export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
