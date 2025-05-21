import {
    NodePgDatabase
} from "drizzle-orm/node-postgres";

async function createOrder(
    db: NodePgDatabase,
    email: string,
    item: string,
    qty: number,
    price: number
) {
    //const res = await db.insert()
}

export default createOrder;