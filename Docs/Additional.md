# Additional.md

## 1. Technical Risks & Edge Cases

- **Missing RPC Callbacks:** If a client requests an RPC and drops off the network before the response, the server still processes the request. The client memory might leak unresolved Promises. *Mitigation: Implement a standard timeout (e.g., 15s) for all RPC calls on the client.*
- **Stale Feed Subscriptions:** If a client disconnects ungracefully, the server might try to push feeds to a dead socket. *Mitigation: Heartbeat (ping/pong) is strictly required to clear dead subscriptions.*

## 2. Scaling Challenges

- **Stateful Connections:** WebSockets are stateful. If you scale to 5 backend servers behind a load balancer, `Client A` on `Server 1` cannot natively subscribe to a feed emitted by `Server 2`.
- *Solution Path:* In the future, the `FeedManager` will need an interface. The default is `MemoryFeedManager`. To scale horizontally, developers will implement a `RedisFeedManager` that uses Redis Pub/Sub to sync feeds across all server instances.

## 3. Security Considerations

- **Authentication:** WebSockets cannot easily send standard HTTP Authorization headers natively from browsers. *Solution:* Implement a `authenticate(token)` RPC method that upgrades the socket's internal state to "authenticated" before allowing access to secure Feeds or RPCs.
- **Denial of Service (DoS):** Uncapped RPC requests can lock up the Node event loop. You must expose middleware hooks in the server router to allow developers to implement rate-limiting per socket ID.
- **Message Size Limits:** Enforce strict payload size limits (e.g., 1MB max) on the WebSocket server to prevent memory buffer overflow attacks.
