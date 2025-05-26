import { eq, InferInsertModel, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import orders from "../tables/orders";

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

    async calculateRevenue(): Promise<number> {
        const result = await this.db
            .select({
                total: sql`COALESCE(SUM(${orders.unit_price} * ${orders.qty}), 0)`
                    .as('total')
            },).from(orders);
        const total: number = Number(result[0].total); //as unknown as number;
        
        return total;
    }
}

export default Order;