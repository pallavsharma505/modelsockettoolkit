import { MSTClient } from '@pallavsharma505/modelsockettoolkit/client';

const SERVER_URL = 'ws://localhost:8080';

async function main() {
  const client = new MSTClient({
    url: SERVER_URL,
    reconnect: false,
    auth: { apiKey: 'my-secret-api-key' },
  });

  // ── Manifest ─────────────────────────────────────────────────────────────

  client.onManifest((manifest) => {
    console.log('');
    console.log('📋 Server Manifest Received:');
    console.log(`   Name:        ${manifest.name}`);
    console.log(`   Version:     ${manifest.version}`);
    console.log(`   Description: ${manifest.description ?? 'N/A'}`);
    console.log(`   Tools:       ${manifest.tools.map((t) => t.name).join(', ')}`);
    console.log(`   Feeds:       ${manifest.feeds?.map((f) => f.name).join(', ') ?? 'none'}`);
    console.log('');
  });

  // ── Error handler ────────────────────────────────────────────────────────

  client.onError((msg) => {
    console.error(`❌ Server error: ${msg}`);
  });

  client.onDisconnect((error) => {
    if (error) console.error(`🔌 Disconnected: ${error}`);
  });

  // ── Connect ──────────────────────────────────────────────────────────────

  console.log(`Connecting to ${SERVER_URL}...`);
  await client.connect();
  console.log('✅ Connected!\n');

  // Wait a moment for the manifest to arrive
  await sleep(200);

  // ── RPC Calls ────────────────────────────────────────────────────────────

  console.log('── RPC Calls ──────────────────────────────────');

  const greetResult = await client.call('greet', { name: 'Alice' });
  console.log('greet("Alice"):', greetResult);

  const addResult = await client.call('add', { a: 17, b: 25 });
  console.log('add(17, 25):   ', addResult);

  const echoResult = await client.call('echo', { ping: 'pong', ts: Date.now() });
  console.log('echo({...}):   ', echoResult);

  // ── Feed Subscriptions ───────────────────────────────────────────────────

  console.log('\n── Feed Subscriptions (5 seconds) ─────────────');

  let clockCount = 0;
  const unsubClock = client.subscribe('clock', (data) => {
    clockCount++;
    const { time } = data as { time: string };
    console.log(`  🕐 clock #${clockCount}: ${time}`);
  });

  let randomCount = 0;
  const unsubRandom = client.subscribe('random', (data) => {
    randomCount++;
    const { value } = data as { value: number };
    console.log(`  🎲 random #${randomCount}: ${value.toFixed(4)}`);
  });

  // Listen for 5 seconds then clean up
  await sleep(5000);

  unsubClock();
  unsubRandom();

  console.log(`\n── Done ───────────────────────────────────────`);
  console.log(`Received ${clockCount} clock events, ${randomCount} random events.`);

  client.close();
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
