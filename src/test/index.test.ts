import { beforeAll, afterAll, expect, test } from 'vitest';
import retry from 'async-retry';
import Docker from 'dockerode';
import getPort from 'get-port';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

let pgContainer: Docker.Container;
let db: NodePgDatabase;
let client: Client;

async function createDocker(): Promise<string> {
    const docker = new Docker()
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

test('simple docker example', async ctx => {
    const res = await db.execute('select 1');

    expect(res.rows).toStrictEqual([{'?column?': 1 }]);
});