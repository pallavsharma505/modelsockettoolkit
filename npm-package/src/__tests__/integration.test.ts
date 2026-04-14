import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { MSTServer } from '../server/MSTServer';
import { MSTClient } from '../client/MSTClient';
import type { ServerManifest } from '../shared/manifest';

const TEST_PORT = 9876;
const TEST_URL = `ws://localhost:${TEST_PORT}`;

const TEST_MANIFEST: ServerManifest = {
  name: 'TestServer',
  version: '1.0.0',
  tools: [
    {
      name: 'echo',
      description: 'Echoes back the input',
      arguments: [{ name: 'message', type: 'string', required: true }],
    },
  ],
  feeds: [
    { name: 'ticker', description: 'Price ticker feed' },
  ],
};

describe('MST Integration', () => {
  let server: MSTServer;
  let client: MSTClient;

  before(async () => {
    server = new MSTServer({
      port: TEST_PORT,
      manifest: TEST_MANIFEST,
    });

    server.rpc('echo', (payload) => {
      return payload;
    });

    server.rpc('add', (payload) => {
      const { a, b } = payload as { a: number; b: number };
      return { result: a + b };
    });

    server.rpc('fail', () => {
      throw new Error('Intentional failure');
    });

    client = new MSTClient({ url: TEST_URL, reconnect: false });
    await client.connect();
    // Wait for the manifest to arrive
    await new Promise((r) => setTimeout(r, 100));
  });

  after(async () => {
    client.close();
    await server.close();
  });

  it('should receive server manifest on connect', () => {
    const m = client.manifest;
    assert.ok(m, 'Manifest should be received');
    assert.equal(m!.name, 'TestServer');
    assert.equal(m!.version, '1.0.0');
    assert.equal(m!.tools.length, 1);
    assert.equal(m!.tools[0].name, 'echo');
    assert.equal(m!.feeds!.length, 1);
    assert.equal(m!.feeds![0].name, 'ticker');
  });

  it('should call RPC and receive result', async () => {
    const result = await client.call('echo', { hello: 'world' });
    assert.deepEqual(result, { hello: 'world' });
  });

  it('should call RPC with computation', async () => {
    const result = await client.call('add', { a: 3, b: 7 });
    assert.deepEqual(result, { result: 10 });
  });

  it('should handle RPC errors', async () => {
    await assert.rejects(
      () => client.call('fail'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Intentional failure/);
        return true;
      },
    );
  });

  it('should handle unknown RPC method', async () => {
    await assert.rejects(
      () => client.call('nonexistent'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Unknown RPC method/);
        return true;
      },
    );
  });

  it('should subscribe to feed and receive data', async () => {
    const received: unknown[] = [];
    const unsub = client.subscribe('ticker', (data) => {
      received.push(data);
    });

    const tickerFeed = server.feed('ticker');

    await new Promise((r) => setTimeout(r, 50));

    tickerFeed.emit({ price: 100 });
    tickerFeed.emit({ price: 200 });

    await new Promise((r) => setTimeout(r, 100));

    assert.equal(received.length, 2);
    assert.deepEqual(received[0], { price: 100 });
    assert.deepEqual(received[1], { price: 200 });

    unsub();
  });

  it('should stop receiving after unsubscribe', async () => {
    const received: unknown[] = [];
    const unsub = client.subscribe('ticker', (data) => {
      received.push(data);
    });

    const tickerFeed = server.feed('ticker');

    await new Promise((r) => setTimeout(r, 50));


    tickerFeed.emit({ price: 100 });
    await new Promise((r) => setTimeout(r, 50));

    unsub();
    await new Promise((r) => setTimeout(r, 50));

    tickerFeed.emit({ price: 200 });
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { price: 100 });
  });

  it('should deliver onManifest callback', async () => {
    const client2 = new MSTClient({ url: TEST_URL, reconnect: false });

    const manifests: ServerManifest[] = [];
    client2.onManifest((m) => manifests.push(m));

    await client2.connect();
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(manifests.length, 1);
    assert.equal(manifests[0].name, 'TestServer');

    client2.close();
  });

  it('should handle server errors gracefully', async () => {
    const errors: string[] = [];
    client.onError((msg) => errors.push(msg));

    // Send a raw invalid message type to trigger error
    const ws = (client as any).ws as WebSocket;
    ws.send(JSON.stringify({ type: 'bogus_type' }));

    await new Promise((r) => setTimeout(r, 100));

    assert.equal(errors.length, 1);
    assert.match(errors[0], /Unknown message type/);
  });
});
