import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { MSTServer } from '../server/MSTServer';
import { MSTClient } from '../client/MSTClient';
import type { ServerManifest } from '../shared/manifest';

const AUTH_PORT = 9877;
const AUTH_URL = `ws://localhost:${AUTH_PORT}`;

const TEST_MANIFEST: ServerManifest = {
  name: 'AuthServer',
  version: '1.0.0',
  tools: [
    {
      name: 'ping',
      description: 'Returns pong',
      arguments: [],
    },
  ],
};

const VALID_CREDS = { user: 'admin', password: 'secret123' };

describe('MST Auth', () => {
  let server: MSTServer;

  before(() => {
    server = new MSTServer({
      port: AUTH_PORT,
      manifest: TEST_MANIFEST,
      authResolver: (creds) => {
        return creds.user === VALID_CREDS.user && creds.password === VALID_CREDS.password;
      },
    });

    server.rpc('ping', () => 'pong');
  });

  after(async () => {
    await server.close();
  });

  it('should authenticate with valid credentials and receive manifest', async () => {
    const client = new MSTClient({
      url: AUTH_URL,
      reconnect: false,
      auth: { user: 'admin', password: 'secret123' },
    });

    const manifests: ServerManifest[] = [];
    client.onManifest((m) => manifests.push(m));

    await client.connect();
    await new Promise((r) => setTimeout(r, 200));

    assert.equal(manifests.length, 1);
    assert.equal(manifests[0].name, 'AuthServer');
    assert.ok(client.manifest);

    const result = await client.call('ping');
    assert.equal(result, 'pong');

    client.close();
  });

  it('should reject invalid credentials and fire onDisconnect', async () => {
    const client = new MSTClient({
      url: AUTH_URL,
      reconnect: false,
      auth: { user: 'admin', password: 'wrong' },
    });

    const disconnectErrors: (string | undefined)[] = [];
    client.onDisconnect((err) => disconnectErrors.push(err));

    await client.connect();
    await new Promise((r) => setTimeout(r, 200));

    assert.ok(disconnectErrors.length > 0, 'onDisconnect should have fired');
    assert.ok(
      disconnectErrors.some((e) => e && /Authentication failed/.test(e)),
      'Should contain auth failure reason',
    );
    assert.equal(client.manifest, null, 'Manifest should not be received');

    client.close();
  });

  it('should reject when client sends non-auth message first', async () => {
    const client = new MSTClient({
      url: AUTH_URL,
      reconnect: false,
      // No auth provided — will not send auth message
    });

    const disconnectErrors: (string | undefined)[] = [];
    client.onDisconnect((err) => disconnectErrors.push(err));

    await client.connect();

    // Send an RPC without authenticating first
    const ws = (client as any).ws as WebSocket;
    ws.send(JSON.stringify({ type: 'rpc_req', id: '123', method: 'ping', payload: null }));

    await new Promise((r) => setTimeout(r, 200));

    assert.equal(client.manifest, null, 'Manifest should not be received');
    // Connection should have been closed by server
    client.close();
  });

  it('should support async authResolver', async () => {
    const ASYNC_PORT = 9878;
    const asyncServer = new MSTServer({
      port: ASYNC_PORT,
      manifest: TEST_MANIFEST,
      authResolver: async (creds) => {
        // Simulate async DB lookup
        await new Promise((r) => setTimeout(r, 50));
        return creds.token === 'valid-jwt-token';
      },
    });

    asyncServer.rpc('ping', () => 'pong');

    const client = new MSTClient({
      url: `ws://localhost:${ASYNC_PORT}`,
      reconnect: false,
      auth: { token: 'valid-jwt-token' },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 200));

    assert.ok(client.manifest, 'Should receive manifest after async auth');
    const result = await client.call('ping');
    assert.equal(result, 'pong');

    client.close();
    await asyncServer.close();
  });

  it('should work without auth when no authResolver is configured', async () => {
    const NO_AUTH_PORT = 9879;
    const noAuthServer = new MSTServer({
      port: NO_AUTH_PORT,
      manifest: TEST_MANIFEST,
    });

    noAuthServer.rpc('ping', () => 'pong');

    // Client sends auth, but server has no authResolver — should still work
    const client = new MSTClient({
      url: `ws://localhost:${NO_AUTH_PORT}`,
      reconnect: false,
      auth: { user: 'someone', password: 'something' },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 200));

    assert.ok(client.manifest, 'Should receive manifest without auth');
    assert.equal(client.manifest!.name, 'AuthServer');

    client.close();
    await noAuthServer.close();
  });
});
