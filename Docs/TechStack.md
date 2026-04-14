# TechStack.md

## 1. Language: TypeScript

**Justification:** For a library defining communication protocols, Type Safety is paramount. TypeScript allows developers to define API contracts that validate payloads at compile time. It also compiles cleanly to JavaScript for universal browser/Node support.

## 2. Backend Runtime / Server: Node.js + `ws` library

**Justification:** Node.js is the industry standard for lightweight, non-blocking real-time servers. The `ws` library is the fastest, most thoroughly tested WebSocket implementation for Node.js. It avoids the heavy overhead and proprietary protocols of libraries like Socket.io, aligning with your goal to build a clean toolkit.

## 3. Frontend Client: Isomorphic TypeScript (Native Browser WebSockets)

**Justification:** The `MSTClient` should use the native `WebSocket` object available in all modern browsers. This keeps the bundle size incredibly small (zero dependencies). For Node.js client usage, you can inject the `ws` polyfill.

## 4. Input Validation: Zod (Optional Peer Dependency)

**Justification:** Because data comes over the network, TypeScript types are erased at runtime. Integrating `Zod` allows developers to define schemas on the server to validate incoming RPC arguments, ensuring malicious or malformed payloads are rejected safely.

## 5. Build Tools: Tsup / Vite

**Justification:** `tsup` is the fastest zero-config bundler for generating ESM and CommonJS library packages for the server and client.
