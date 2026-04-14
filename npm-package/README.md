# @pallavsharma505/modelsockettoolkit

**MST (Model Socket Toolkit)** — lightweight bi-directional RPC & PubSub feeds over a single WebSocket.

[![npm](https://img.shields.io/npm/v/@pallavsharma505/modelsockettoolkit)](https://www.npmjs.com/package/@pallavsharma505/modelsockettoolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- **Promise-based RPC** — call server methods with `await`, no callback hell
- **PubSub Feeds** — subscribe to server-side event streams (AI tokens, live data, progress bars)
- **Server Manifest** — clients auto-receive a declarative description of available tools and feeds on connect
- **Connection Heartbeat** — automatic ping/pong to detect and purge dead connections
- **TypeScript first** — full type definitions, ESM + CJS dual output

## Install

```bash
npm install @pallavsharma505/modelsockettoolkit
```

## Quick Start

### Server

```typescript
import { MSTServer } from '@pallavsharma505/modelsockettoolkit/server';

const server = new MSTServer({
  port: 8080,
  manifest: {
    name: 'My API',
    version: '1.0.0',
    tools: [
      {
        name: 'greet',
        description: 'Returns a greeting',
        arguments: [{ name: 'name', type: 'string', required: true }],
      },
    ],
    feeds: [
      { name: 'time', description: 'Streams Unix timestamps' },
    ],
  },
});

// Register an RPC handler
server.rpc('greet', (payload: any) => {
  return `Hello, ${payload.name}!`;
});

// Push to a feed
setInterval(() => {
  server.feed('time').emit(Date.now());
}, 1000);
```

### Client

```typescript
import { MSTClient } from '@pallavsharma505/modelsockettoolkit/client';

const client = new MSTClient({ url: 'ws://localhost:8080' });

client.onManifest((manifest) => {
  console.log('Server:', manifest.name, manifest.version);
  console.log('Tools:', manifest.tools.map(t => t.name));
});

await client.connect();

// Call an RPC
const greeting = await client.call('greet', { name: 'Alice' });
console.log(greeting); // "Hello, Alice!"

// Subscribe to a feed
const unsub = client.subscribe('time', (timestamp) => {
  console.log('Time:', timestamp);
});

// Unsubscribe later
unsub();
```

## API Reference

### Subpath Exports

| Import path | Contents |
|---|---|
| `@pallavsharma505/modelsockettoolkit` | Shared types (protocol messages, manifest) |
| `@pallavsharma505/modelsockettoolkit/server` | `MSTServer`, `FeedHandle`, server types |
| `@pallavsharma505/modelsockettoolkit/client` | `MSTClient`, client types |

### `MSTServer`

```typescript
new MSTServer(options: MSTServerOptions)
```

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | *required* | WebSocket server port |
| `manifest` | `ServerManifest` | *required* | Declarative server description |
| `heartbeatInterval` | `number` | `30000` | Ping interval (ms) |
| `heartbeatTimeout` | `number` | `5000` | Pong timeout (ms) |
| `maxPayloadSize` | `number` | `1048576` | Max message size (bytes) |

**Methods:**

| Method | Description |
|---|---|
| `rpc(method, handler)` | Register an RPC handler. Handler receives `(payload, context)` and returns the result. |
| `feed(name)` | Get a `FeedHandle` to emit data to subscribers. |
| `close()` | Gracefully shut down the server. Returns a Promise. |

### `MSTClient`

```typescript
new MSTClient(options: MSTClientOptions)
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | *required* | WebSocket URL (`ws://` or `wss://`) |
| `reconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `reconnectInterval` | `number` | `3000` | Delay between reconnect attempts (ms) |
| `maxReconnectAttempts` | `number` | `10` | Max reconnect attempts |

**Methods:**

| Method | Description |
|---|---|
| `connect()` | Connect to the server. Returns a Promise. |
| `call(method, payload?, timeout?)` | Call an RPC method. Returns a Promise with the result. |
| `subscribe(feed, callback)` | Subscribe to a feed. Returns an unsubscribe function. |
| `onManifest(callback)` | Register a callback for when the server manifest is received. |
| `onError(callback)` | Register a callback for server errors. |
| `close()` | Disconnect from the server. |

**Properties:**

| Property | Type | Description |
|---|---|---|
| `manifest` | `ServerManifest \| null` | The server manifest (available after connect). |

### `ServerManifest`

```typescript
interface ServerManifest {
  name: string;
  version: string;
  description?: string;
  tools: ToolDefinition[];
  feeds?: FeedDefinition[];
}
```

### Wire Protocol

All messages are JSON over WebSocket. Message types:

| Type | Direction | Purpose |
|---|---|---|
| `rpc_req` | Client → Server | RPC request |
| `rpc_res` | Server → Client | RPC response |
| `feed_sub` | Client → Server | Subscribe to feed |
| `feed_unsub` | Client → Server | Unsubscribe from feed |
| `feed_data` | Server → Client | Feed data push |
| `server_manifest` | Server → Client | Server manifest (sent on connect) |
| `error` | Server → Client | Error message |

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## License

MIT
