# Protocol_Specification.md

## MST Wire Protocol

For the client and server to understand each other perfectly, all messages sent over the WebSocket connection must conform to this JSON schema.

### 1. Base Message Format

Every message must contain a `type` string.

```json
{
  "type": "rpc_req" | "rpc_res" | "feed_sub" | "feed_unsub" | "feed_data" | "server_manifest" | "error"
}
```

### 2. Server Manifest (Server -> Client)

Sent automatically to the client immediately upon WebSocket connection. Describes the server's identity, available RPC tools, and feed channels.

```json
{
  "type": "server_manifest",
  "manifest": {
    "serverName": "My API",
    "serverDescription": "A greeting and time service",
    "tools": [
      {
        "name": "Greet",
        "description": "Returns a greeting for the given name",
        "invokeName": "greet",
        "arguments": [
          { "name": "name", "type": "string", "required": true, "description": "The user's name" }
        ]
      }
    ],
    "feeds": [
      {
        "name": "Server Time",
        "description": "Pushes the current Unix timestamp every second",
        "listenName": "time"
      }
    ]
  }
}
```

### 3. RPC Request (Client -> Server)

Requires a unique `id` to map the response back to the correct Promise.

```json
{
  "type": "rpc_req",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "method": "getUser",
  "payload": { "userId": 42 }
}
```

### 4. RPC Response (Server -> Client)

```json
{
  "type": "rpc_res",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "data": { "name": "Alice", "role": "admin" },
  "error": null
}
```

### 5. Feed Subscription (Client -> Server)

```json
{
  "type": "feed_sub",
  "feed": "system-metrics"
}
```

### 6. Feed Broadcast (Server -> Client)

Pushed asynchronously to any client who sent a `feed_sub`.

```json
{
  "type": "feed_data",
  "feed": "system-metrics",
  "data": { "cpu": "45%", "ram": "2GB" }
}
```
