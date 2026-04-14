# MST (Model Socket Toolkit)

Welcome to MST! MST is a lightweight, bi-directional toolkit for Node.js and the Browser that unifies Remote Procedure Calls (RPC) and PubSub Feeds over a single WebSocket connection. 

## 📖 Table of Contents

1. [Project Overview](Docs/Project.md)
2. [Architecture](Docs/Architecture.md)
3. [Features & Roadmap](Docs/Features.md)
4. [Technology Stack](Docs/TechStack.md)
5. [Additional Constraints & Scaling](Docs/Additional.md)
6. [MST Protocol Specification](Docs/Protocol_Specification.md)
7. [Plan of Action (Development Steps)](Docs/PlanOfAction.md)

## 🚀 Quick Start (Pseudocode)

**Server (`@mst/server`):**

```typescript
import { MSTServer } from '@mst/server';

const server = new MSTServer({
  port: 8080,
  manifest: {
    serverName: 'My API',
    serverDescription: 'A greeting and time service',
    tools: [
      {
        name: 'Greet',
        description: 'Returns a greeting for the given name',
        invokeName: 'greet',
        arguments: [{ name: 'name', type: 'string' }],
      },
    ],
    feeds: [
      {
        name: 'Server Time',
        description: 'Pushes the current Unix timestamp every second',
        listenName: 'time',
      },
    ],
  },
});

// 1. Define an RPC
server.rpc('greet', (data) => {
  return `Hello, ${data.name}!`;
});

// 2. Push to a Feed
setInterval(() => {
  server.feed('time').emit(Date.now());
}, 1000);


 // Client(`@mst/client`)
import { MSTClient } from '@mst/client';

const client = new MSTClient('ws://localhost:8080');

// The server manifest is automatically received on connect
client.onManifest((manifest) => {
  console.log('Server:', manifest.serverName);
  console.log('Tools:', manifest.tools.map(t => t.invokeName));
  console.log('Feeds:', manifest.feeds.map(f => f.listenName));
});

client.onConnect(async () => {
  // Call RPC
  const msg = await client.invoke('greet', { name: 'Alice' });
  console.log(msg); // "Hello, Alice!"

  // Listen to Feed
  client.subscribe('time', (timestamp) => {
    console.log('Server time:', timestamp);
  });
});
```
