import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { integer, numeric, pgTable, PgTable, serial, text } from "drizzle-orm/pg-core";

const orders: PgTable = pgTable('orders', {
    id: serial('id').primaryKey(),
    cutomerEmail: text('customer_email').notNull(),
    item: text('item').notNull(),
    qty: integer('qty').notNull(),
    unit_price: numeric('unit_price').notNull(),
    status: text('status').notNull().default('NEW'),
})

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
            throw new Error('ValidationError: Invalid email');

        if(qty <= 0)
            throw new Error('ValidationError: Invalid qty');

        if(price <= 0)
            throw new Error('ValidationError: Invalid price');

        //await this.db.insert()
        return 1;
    };
}