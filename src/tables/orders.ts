import {
    integer,
    numeric,
    pgTable,
    serial,
    text,
    timestamp
} from "drizzle-orm/pg-core";

const orders = pgTable('orders', {
    id: serial('id')
        .primaryKey(),
    customer_email: text('customer_email')
        .notNull(),
    item: text('item')
        .notNull(),
    qty: integer('qty')
        .notNull(),
    unit_price: numeric('unit_price')
        .notNull(),
    status: text('status')
        .notNull()
        .default('NEW'),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow()
});

export default orders;