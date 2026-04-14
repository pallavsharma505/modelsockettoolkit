# Features.md

## 1. Core MVP (Minimum Viable Product)

- **Bi-directional Connection Wrapper:** Automatic connection, JSON serialization/deserialization, and basic error handling.
- **Server Manifest:** Declarative server configuration (`serverName`, `serverDescription`, `tools`, `feeds`) automatically sent to clients on connection for self-describing APIs.
- **Promise-Based RPC:** Invoke server methods from the client and `await` the response.
- **Feed Pub/Sub:** Subscribe to server-side events, unsubscribe, and broadcast from server to specific feeds.
- **Connection Heartbeat:** Ping/pong implementation to detect dead connections and prevent silent drops.

## 2. Future Enhancements

- **Type-Safe Contracts:** End-to-end type safety using generics (sharing a TypeScript interface between client and server).
- **Auto-Reconnection & Backoff:** Smart exponential backoff when the server goes down.
- **Binary Serialization:** Support for MessagePack for high-performance, low-bandwidth data transfer.
- **Horizontal Scaling:** Redis adapter for the Feed Manager, allowing feeds to be broadcast across multiple MSTServer instances.

## 3. User Stories (Core MVP)

### **Feature: Promise-Based RPC**

> **As a** frontend developer, 
> **I want to** call an MST RPC method using `await`, 
> **So that** I don't have to deal with raw WebSocket event listeners and callback hell.
*Acceptance Criteria:* Client `invoke` method returns a standard JavaScript Promise. If the server throws an error, the Promise rejects on the client with the error message.

### **Feature: Feed Pub/Sub**

> **As a** backend developer, 
> **I want to** push data to a specific feed channel independently of any client request, 
> **So that** I can stream live progress bars or AI tokens to the user UI.
*Acceptance Criteria:* Server exposes an `.emit(feedName, payload)` method. Only clients actively subscribed to `feedName` receive the network packet.

### **Feature: Connection Heartbeat**

> **As a** system administrator, 
> **I want** the toolkit to automatically ping clients, 
> **So that** disconnected or hanging clients are purged from memory, preventing memory leaks.
*Acceptance Criteria:* Server pings every 30 seconds. Clients must respond within 5 seconds or their socket is forcefully terminated.
