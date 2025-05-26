import path from 'path';
import { beforeAll, afterAll, expect, test, describe, it } from 'vitest';
import retry from 'async-retry';
import Docker from 'dockerode';
import getPort from 'get-port';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import Order from '../classes/Order';
import orders from '../tables/orders';

let pgContainer: Docker.Container;
let db: NodePgDatabase;
let client: Client;
const sqlFilePath: string = path.resolve('src/sql/init.sql');

async function createDocker(): Promise<string> {
    const docker = new Docker();
    const port: number = await getPort({ port: 5432 });
    const image: string = 'postgres:17';
    const pullSchema = await docker.pull(image);

    await new Promise((res, rej) => {
        docker.modem.followProgress(pullSchema, e => e ? rej(e) : res(e)); 
    });

    pgContainer = await docker.createContainer({
        Image: image,
        Env: [
            'POSTGRES_USER =postgres',
            'POSTGRES_PASSWORD=123123123',
            'POSTGRES_DB=db_test'
        ],
        name: 'docker-tests',
        HostConfig: {
            AutoRemove: true,
            Binds: [`${sqlFilePath}:/docker-entrypoint-initdb.d/init.sql`],
            PortBindings: {
                '5432/tcp': [{ HostPort: `${port}` }]
            }
        }
    });

    await pgContainer.start();

    return `postgres://postgres:123123123@localhost:${port}/db_test`;
}

beforeAll(async () => {
    const connectionString = await createDocker();

    client = await retry(async () => {
        client = new Client(connectionString);
        await client.connect();
        return client
    }, {
        retries: 20,
        factor: 1,
        minTimeout: 250,
        maxTimeout: 250,
        randomize: false,
        onRetry: () => {
            client?.end();
        }
    });

    db = drizzle(client);
}, 1000000);

afterAll(async () => {
    await client?.end();
    await pgContainer?.stop().catch(console.error);
});

// describe('default database setting', () => {
//     it('should create an orders table', async ctx => {
//         await db.execute(`
//                 CREATE TABLE orders (
//                     id SERIAL PRIMARY KEY,
//                     customer_email TEXT NOT NULL,
//                     item TEXT NOT NULL,
//                     qty INTEGER NOT NULL CHECK (qty > 0),
//                     unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
//                     status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'PAID', 'CANCELLED')),
//                     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
//                 );
//         `);

//         const res = await db.execute(`
//             SELECT * FROM pg_tables
//             WHERE schemaname = 'public' AND tablename = 'orders';
//         `);

//         expect(res.rows.length).toBeGreaterThan(0);
//     })
// });

describe('testing the createOrder function', () => {
    it('returned id should be equal to 1', async () => {
        const orderInstance: Order = new Order(db);
        const id: number = await orderInstance
            .createOrder('someone@i.ua', 'Poster', 32, 3000);

        expect(id).toBe(1);
    });

    it('should throw an exception because of invalid email', async () => {
        const orderInstance: Order = new Order(db);

        await expect(orderInstance.createOrder('someonei.ua', 'Suit', 2, 4000))
            .rejects.toThrowError('ValidationError: invalid email');
    });

    it('should throw an exception because of invalid qty', async () => {
        const orderInstance: Order = new Order(db);
        await expect(orderInstance.createOrder('s@i.ua', 'Toy car', 0, 200))
            .rejects.toThrowError('ValidationError: invalid qty');
    });

    it('should throw an exception because of invalid qty', async () => {
        const orderInstance: Order = new Order(db);
        await expect(orderInstance.createOrder('s@i.ua', 'Toy car', -1, 200))
            .rejects.toThrowError('ValidationError: invalid qty');
    });

    it('should throw an exception because of invalid price', async () => {
        const orderInstance: Order = new Order(db);
        await expect(orderInstance.createOrder('s@i.ua', 'Toy car', 1, 0))
            .rejects.toThrowError('ValidationError: invalid price');
    });

    it('should throw an exception because of invalid price', async () => {
        const orderInstance: Order = new Order(db);
        await expect(orderInstance.createOrder('s@i.ua', 'Toy car', 1, -1))
            .rejects.toThrowError('ValidationError: invalid price');
    });
});

describe('testing the payOrder function', async () => {
    it('should change the status of the order', async () => {
        const orderInstance: Order = new Order(db);
        const isUpdated: boolean = await orderInstance.payOrder(1);

        expect(isUpdated).toBe(true);
    });

    it('should throw an error because the order status is different from "NEW"', async () => {
        const orderInstance: Order = new Order(db);

        await expect(orderInstance.payOrder(1))
            .rejects
            .toThrowError('InvalidState: the order must have the "NEW" status');
    });

    it('should throw an error because the order with given id does not exist', async () => {
        const orderInstance: Order = new Order(db);

        await expect(orderInstance.payOrder(2))
            .rejects
            .toThrowError('OrderNotFount: there\'s no row with the given id');
    });
});

describe('testing the calculateRevenue function', async () => {
    it('should return 0 because there\'s no payed orders', async () => {
        const ordersInstance: Order = new Order(db);
        
        await db.delete(orders);
        
        const sum: number = await ordersInstance.calculateRevenue();

        expect(sum).toBe(0);
    });

    it('should return the sum of the prices', async () => {
        const orderInstance: Order = new Order(db);
        const expectedSum: number = 120.95;

        await orderInstance
            .createOrder('someone@i.ua', 'Poster', 2, 50.40);
        
        await orderInstance
            .createOrder('someone@i.ua', 'Poster', 1, 20.15);

        const sum: number = await orderInstance
            .calculateRevenue();

        expect(sum).toBe(expectedSum);
    });
});