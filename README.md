# MST (Model Socket Toolkit)

Welcome to MST! MST is a lightweight, bi-directional toolkit for Node.js and the Browser that unifies Remote Procedure Calls (RPC) and PubSub Feeds over a single WebSocket connection.

[![npm](https://img.shields.io/npm/v/@pallavsharma505/modelsockettoolkit)](https://www.npmjs.com/package/@pallavsharma505/modelsockettoolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 📦 Install

```bash
npm install @pallavsharma505/modelsockettoolkit
```

## 📖 Table of Contents

1. [Project Overview](Docs/Project.md)
2. [Architecture](Docs/Architecture.md)
3. [Features & Roadmap](Docs/Features.md)
4. [Technology Stack](Docs/TechStack.md)
5. [Additional Constraints & Scaling](Docs/Additional.md)
6. [MST Protocol Specification](Docs/Protocol_Specification.md)
7. [Plan of Action (Development Steps)](Docs/PlanOfAction.md)

## 🚀 Quick Start

**Server:**

```typescript
import { MSTServer } from '@pallavsharma505/modelsockettoolkit/server';

const server = new MSTServer({
  port: 8080,
  // Optional: require authentication
  authResolver: (credentials) => {
    return credentials.apiKey === 'my-secret-key';
  },
  manifest: {
    name: 'My API',
    version: '1.0.0',
    description: 'A greeting and time service',
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

// 1. Define an RPC
server.rpc('greet', (data: any) => {
  return `Hello, ${data.name}!`;
});

// 2. Push to a Feed
setInterval(() => {
  server.feed('time').emit(Date.now());
}, 1000);
```

**Client:**

```typescript
import { MSTClient } from '@pallavsharma505/modelsockettoolkit/client';

const client = new MSTClient({
  url: 'ws://localhost:8080',
  // Optional: send credentials if server requires auth
  auth: { apiKey: 'my-secret-key' },
});

// The server manifest is automatically received on connect
client.onManifest((manifest) => {
  console.log('Server:', manifest.name);
  console.log('Tools:', manifest.tools.map(t => t.name));
  console.log('Feeds:', manifest.feeds?.map(f => f.name));
});

await client.connect();

// Call RPC
const msg = await client.call('greet', { name: 'Alice' });
console.log(msg); // "Hello, Alice!"

// Listen to Feed
const unsub = client.subscribe('time', (timestamp) => {
  console.log('Server time:', timestamp);
});

// Unsubscribe later
unsub();
```

See [SampleServer/](SampleServer/) and [SampleClient/](SampleClient/) for complete working examples.
