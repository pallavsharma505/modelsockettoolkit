# Architecture.md

## 1. High-Level System Architecture

The MST ecosystem consists of two primary packages: `@mst/server` and `@mst/client`. They communicate over standard TCP WebSockets.

- **MSTServer:** Acts as the host, managing active connections (sockets), registering RPC handlers, and maintaining a registry of active Feeds.
- **MSTClient:** Acts as the consumer, managing the physical connection, queueing messages if disconnected, and mapping server responses back to local Promises or Feed callbacks.

## 2. Design Patterns

- **Command Pattern:** Every message sent over the wire is standardized into a "Command" payload (e.g., `type: 'rpc'`, `type: 'subscribe'`).
- **Observer Pattern:** Used extensively for the Feed system. Clients subscribe as observers to specific Feed topics.
- **Adapter Pattern:** The core logic is agnostic to the transport layer. The default adapter is `ws` (WebSockets), but this allows for future WebRTC or IPC adapters.

## 3. Structural Organization

- **Connection Manager:** Handles connection lifecycle (connect, disconnect, ping/pong heartbeats).
- **RPC Router:** A hash map linking string identifiers (e.g., `getUser`) to server-side functions.
- **Feed Manager:** Tracks topics and stores sets of connected client IDs subscribed to each topic.
- **Server Manifest:** A declarative configuration object provided at server creation that describes the server's identity, available tools (RPCs), and feed channels. Automatically pushed to every client on connection.

## 4. Data Flow Description

**Manifest Flow:**

1. Server is created with a `manifest` config describing `serverName`, `serverDescription`, `tools`, and `feeds`.
2. Client connects via WebSocket.
3. Server immediately sends a `server_manifest` message containing the full manifest.
4. Client stores the manifest and triggers any registered `onManifest` callbacks.
5. Client can access the manifest at any time via `client.manifest`.

**RPC Flow:**

1. Client calls `client.rpc('calculate', { x: 5 })`.
2. Client generates a unique UUID for the request, stores the Promise resolver in memory, and sends a JSON payload.
3. Server receives payload, routes to `calculate` handler, executes logic.
4. Server responds with the same UUID and the result.
5. Client intercepts response, matches the UUID, and resolves the local Promise.

**Feed Flow:**

1. Server initializes a feed: `server.createFeed('price-updates')`.
2. Client subscribes: `client.subscribe('price-updates', callback)`.
3. Server registers client ID in the Feed Manager.
4. Server internally broadcasts data: `server.feed('price-updates').emit(data)`.
5. Server iterates over subscribed clients and sends a push message.
6. Client parses the push message and triggers the local callback.
