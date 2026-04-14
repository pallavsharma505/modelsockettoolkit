# Project.md

## 1. Project Description

**MST (Model Socket Toolkit)** is an open-source, bi-directional communication library built on WebSockets. It provides a seamless, type-safe interface for two distinct communication patterns over a single persistent connection: Remote Procedure Calls (RPC) for request-response actions, and Data Feeds (PubSub) for server-pushed streaming events. 

## 2. The Core Problem

Modern web applications require real-time capabilities (live dashboards, AI model token streaming, chat systems). Developers typically have to cobble together REST APIs for actions and WebSockets/SSE for streams, or build complex, boilerplate-heavy custom WebSocket routers to handle both. This leads to fragmented codebases, dropped connections, and untyped message payloads.

## 3. Overarching Vision

To become the standard toolkit for developers looking to bind backend models and services directly to frontends with zero friction. MST will make calling a server-side function or subscribing to a live data feed feel exactly like calling a local JavaScript function.

## 4. Target Audience

- **Backend/Full-Stack Developers:** Building real-time Node.js applications.
- **AI Engineers:** Needing to stream LLM tokens or model processing states back to a client interface.
- **Frontend Engineers:** Wanting a clean, Promise-based API for WebSockets without managing raw event listeners.

## 5. Key Performance Indicators (KPIs)

- **Performance:** Add < 10ms of serialization/routing overhead per message compared to raw WebSockets.
- **Reliability:** 100% successful automatic client reconnection on network drop.
- **Adoption:** Time-to-first-call (TTFC) metric. A new developer should be able to set up a server and invoke a client RPC in under 3 minutes.
