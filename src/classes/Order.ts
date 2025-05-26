import { eq, InferInsertModel } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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

type NewOrder = InferInsertModel<typeof orders>;

class Order {
    db!: NodePgDatabase;

    constructor(db: NodePgDatabase) {
        this.db = db;
    }

    async createOrder(
        email: string,
        item: string,
        qty: number,
        price: number
    ): Promise<number> {
        if(!email.includes('@'))
            throw new Error('ValidationError: invalid email');

        if(qty <= 0)
            throw new Error('ValidationError: invalid qty');

        if(price <= 0)
            throw new Error('ValidationError: invalid price');

        const insertObj: NewOrder = {
            customer_email: email,
            item,
            qty,
            unit_price: price.toString()
        };

        const res = await this.db
            .insert(orders)
            .values(insertObj)
            .returning({ insertedId: orders.id });
        const id: number = res[0].insertedId;
        
        return id;
    }

    async payOrder(id: number): Promise<boolean> {
        const res = await this.db
            .select({ status: orders.status })
            .from(orders)
            .where(eq(orders.id, id));

        if(res.length === 0)
            throw new Error('OrderNotFount: there\'s no row with the given id');

        if(res[0].status !== 'NEW')
            throw new Error('InvalidState: the order must have the "NEW" status');

        await this.db
            .update(orders)
            .set({ status: 'PAID' });

        return true;
    }
}

export default Order;