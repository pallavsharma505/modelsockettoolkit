import { MSTServer } from '@pallavsharma505/modelsockettoolkit/server';

const PORT = 8080;

const server = new MSTServer({
  port: PORT,
  manifest: {
    name: 'SampleServer',
    version: '1.0.0',
    description: 'A sample MST server demonstrating RPC and Feed capabilities',
    tools: [
      {
        name: 'greet',
        description: 'Returns a greeting for the given name',
        arguments: [{ name: 'name', type: 'string', required: true }],
      },
      {
        name: 'add',
        description: 'Adds two numbers together',
        arguments: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true },
        ],
      },
      {
        name: 'echo',
        description: 'Echoes back whatever you send',
        arguments: [{ name: 'message', type: 'string', required: true }],
      },
    ],
    feeds: [
      { name: 'clock', description: 'Broadcasts the current time every second' },
      { name: 'random', description: 'Broadcasts a random number every 2 seconds' },
    ],
  },
});

// ── RPC Handlers ─────────────────────────────────────────────────────────────

server.rpc('greet', (payload) => {
  const { name } = payload as { name: string };
  return { message: `Hello, ${name}! Welcome to MST.` };
});

server.rpc('add', (payload) => {
  const { a, b } = payload as { a: number; b: number };
  return { result: a + b };
});

server.rpc('echo', (payload) => {
  return payload;
});

// ── Feed Emitters ────────────────────────────────────────────────────────────

const clockFeed = server.feed('clock');
setInterval(() => {
  clockFeed.emit({ time: new Date().toISOString() });
}, 1000);

const randomFeed = server.feed('random');
setInterval(() => {
  randomFeed.emit({ value: Math.random() });
}, 2000);

console.log(`✅ SampleServer running on ws://localhost:${PORT}`);
console.log('   RPC methods: greet, add, echo');
console.log('   Feeds: clock, random');
