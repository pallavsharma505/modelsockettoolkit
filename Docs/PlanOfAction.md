# PlanOfAction.md

## Step-by-Step Development Guide

### **Phase 1: Foundation (Week 1)**

1. **Initialize Monorepo:** Setup a monorepo (using Turborepo, pnpm workspaces, or npm workspaces) with two packages: `packages/server` and `packages/client`.
2. **Setup Build Pipeline:** Configure TypeScript and Tsup to output both ESM and CommonJS.
3. **Core Websocket Wrapper:** Implement a basic WebSocket server wrapping the `ws` package in the server, and wrapping the native browser `WebSocket` in the client.

### **Phase 2: The RPC Layer (Week 2)**

1. **Define Protocol Types:** Implement the interfaces defined in `Protocol_Specification.md` internally.
2. **Server Router:** Create the `.rpc()` method to store handler functions in a Map.
3. **Client Invoker:** Create the `.invoke()` method. Implement the UUID generator and the in-memory Map of unresolved Promises.
4. **Wire Them Up:** Write integration tests ensuring `invoke()` reaches the server router and resolves the client Promise upon return.

### **Phase 3: The Feed Layer (Week 3)**

1. **Server Feed Manager:** Create the `.feed()` and `.emit()` methods. Track `Set<Socket>` for each feed topic.
2. **Client Subscriptions:** Implement `.subscribe()` and `.unsubscribe()` to send `feed_sub` messages.
3. **Routing Inbound Feeds:** Update the client message listener to detect `type: 'feed_data'` and trigger local callbacks.

### **Phase 4: Hardening & Release (Week 4)**

1. **Heartbeats:** Implement ping/pong frames to kill dead sockets.
2. **Error Handling:** Standardize error serialization so server throws are caught elegantly on the client.
3. **Documentation:** Translate these Markdown concepts into a public VitePress/Docusaurus site.
4. **Publish:** Publish `@mst/server` and `@mst/client` to NPM.
