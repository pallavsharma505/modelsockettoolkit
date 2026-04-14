import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { randomUUID } from 'crypto';
import type { ClientSocket, MSTServerOptions } from './types';

type MessageHandler = (client: ClientSocket, data: string) => void;
type ConnectionHandler = (client: ClientSocket) => void;
type DisconnectionHandler = (clientId: string) => void;

export class ConnectionManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ClientSocket>();
  private pendingClients = new Map<string, ClientSocket>();
  private authTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly heartbeatInterval: number;
  private readonly heartbeatTimeout: number;
  private readonly maxPayloadSize: number;
  private readonly requiresAuth: boolean;
  private readonly authTimeout: number;

  private onMessageHandler: MessageHandler | null = null;
  private onConnectHandler: ConnectionHandler | null = null;
  private onDisconnectHandler: DisconnectionHandler | null = null;
  private onAuthMessageHandler: MessageHandler | null = null;

  constructor(options: MSTServerOptions) {
    this.heartbeatInterval = options.heartbeatInterval ?? 30_000;
    this.heartbeatTimeout = options.heartbeatTimeout ?? 5_000;
    this.maxPayloadSize = options.maxPayloadSize ?? 1_048_576;
    this.requiresAuth = !!options.authResolver;
    this.authTimeout = options.authTimeout ?? 10_000;
  }

  start(options: MSTServerOptions): void {
    this.wss = new WebSocketServer({
      port: options.port,
      maxPayload: this.maxPayloadSize,
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientSocket = {
        id: randomUUID(),
        ws,
        isAlive: true,
      };

      if (this.requiresAuth) {
        this.pendingClients.set(client.id, client);

        const timer = setTimeout(() => {
          this.rejectClient(client.id, 'Authentication timeout');
        }, this.authTimeout);
        this.authTimers.set(client.id, timer);
      } else {
        this.clients.set(client.id, client);
        this.onConnectHandler?.(client);
      }

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (raw: RawData) => {
        const data = raw.toString();
        if (data.length > this.maxPayloadSize) {
          ws.close(1009, 'Message too large');
          return;
        }

        if (this.requiresAuth && this.pendingClients.has(client.id)) {
          this.onAuthMessageHandler?.(client, data);
        } else {
          this.onMessageHandler?.(client, data);
        }
      });

      ws.on('close', () => {
        if (this.pendingClients.has(client.id)) {
          this.cleanupPending(client.id);
        } else {
          this.clients.delete(client.id);
          this.onDisconnectHandler?.(client.id);
        }
      });

      ws.on('error', () => {
        if (this.pendingClients.has(client.id)) {
          this.cleanupPending(client.id);
        } else {
          this.clients.delete(client.id);
          this.onDisconnectHandler?.(client.id);
        }
      });
    });

    this.startHeartbeat();
  }

  authenticateClient(clientId: string): void {
    const client = this.pendingClients.get(clientId);
    if (!client) return;
    this.cleanupPending(clientId);
    this.clients.set(client.id, client);
    this.onConnectHandler?.(client);
  }

  rejectClient(clientId: string, reason: string): void {
    const client = this.pendingClients.get(clientId);
    if (!client) return;
    this.cleanupPending(clientId);
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.close(4401, reason);
    }
  }

  sendToSocket(client: ClientSocket, data: string): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.onMessageHandler = handler;
  }

  onConnect(handler: ConnectionHandler): void {
    this.onConnectHandler = handler;
  }

  onDisconnect(handler: DisconnectionHandler): void {
    this.onDisconnectHandler = handler;
  }

  onAuthMessage(handler: MessageHandler): void {
    this.onAuthMessageHandler = handler;
  }

  send(clientId: string, data: string): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }

  broadcast(clientIds: Set<string>, data: string): void {
    for (const id of clientIds) {
      this.send(id, data);
    }
  }

  getClient(clientId: string): ClientSocket | undefined {
    return this.clients.get(clientId);
  }

  getClientIds(): Set<string> {
    return new Set(this.clients.keys());
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      for (const client of this.clients.values()) {
        client.ws.terminate();
      }
      this.clients.clear();

      for (const client of this.pendingClients.values()) {
        client.ws.terminate();
      }
      this.pendingClients.clear();

      for (const timer of this.authTimers.values()) {
        clearTimeout(timer);
      }
      this.authTimers.clear();

      if (this.wss) {
        this.wss.close((err) => {
          if (err) reject(err);
          else resolve();
        });
        this.wss = null;
      } else {
        resolve();
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [id, client] of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(id);
          this.onDisconnectHandler?.(id);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }
    }, this.heartbeatInterval);
  }

  private cleanupPending(clientId: string): void {
    this.pendingClients.delete(clientId);
    const timer = this.authTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.authTimers.delete(clientId);
    }
  }
}
