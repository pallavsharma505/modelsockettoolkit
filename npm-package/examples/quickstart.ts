/**
 * MST Quick-Start Example
 *
 * Run with: npx tsx examples/quickstart.ts
 * (from the npm-package directory after `npm install && npm run build`)
 */
import { MSTServer } from '@pallavsharma505/modelsockettoolkit/server';
import { MSTClient } from '@pallavsharma505/modelsockettoolkit/client';

// ── Server ───────────────────────────────────────────────────────────────────

const server = new MSTServer({
  port: 8080,
  manifest: {
    name: 'Greeting Service',
    version: '1.0.0',
    description: 'A simple MST server that greets users and streams time',
    tools: [
      {
        name: 'greet',
        description: 'Returns a greeting for the given name',
        arguments: [{ name: 'name', type: 'string', required: true }],
      },
    ],
    feeds: [
      { name: 'time', description: 'Pushes the current Unix timestamp every second' },
    ],
  },
});

// Register an RPC
server.rpc('greet', (data: any) => {
  return `Hello, ${data.name}!`;
});

// Push to a feed every second
const timer = setInterval(() => {
  server.feed('time').emit(Date.now());
}, 1000);

// ── Client ───────────────────────────────────────────────────────────────────

async function main() {
  const client = new MSTClient({ url: 'ws://localhost:8080', reconnect: false });

  client.onManifest((manifest) => {
    console.log('Connected to:', manifest.name);
    console.log('Description:', manifest.description);
  });

  await client.connect();

  // Call RPC
  const msg = await client.call('greet', { name: 'Alice' });
  console.log(msg); // "Hello, Alice!"

  // Listen to Feed
  const unsub = client.subscribe('time', (timestamp) => {
    console.log('Server time:', timestamp);
  });

  // Stop after 5 seconds
  setTimeout(async () => {
    unsub();
    client.close();
    clearInterval(timer);
    await server.close();
    console.log('Done!');
  }, 5000);
}

main().catch(console.error);
