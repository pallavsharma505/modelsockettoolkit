import {
  type MSTMessage,
  type ErrorMessage,
  type ServerManifestMessage,
  type AuthResultMessage,
  isRPCRequest,
  isFeedSubscribe,
  isFeedUnsubscribe,
  isAuthMessage,
} from '../shared/protocol';
import { ConnectionManager } from './ConnectionManager';
import { RPCRouter } from './RPCRouter';
import { FeedManager, FeedHandle } from './FeedManager';
import type { MSTServerOptions, RPCHandler, ClientSocket, AuthResolver } from './types';

export class MSTServer {
  private connections: ConnectionManager;
  private rpcRouter: RPCRouter;
  private feedManager: FeedManager;
  private readonly manifestPayload: string;
  private readonly authResolver?: AuthResolver;

  constructor(options: MSTServerOptions) {
    this.connections = new ConnectionManager(options);
    this.rpcRouter = new RPCRouter();
    this.feedManager = new FeedManager(this.connections);
    this.authResolver = options.authResolver;

    const manifestMsg: ServerManifestMessage = {
      type: 'server_manifest',
      manifest: options.manifest,
    };
    this.manifestPayload = JSON.stringify(manifestMsg);

    this.connections.onConnect((client) => {
      this.connections.send(client.id, this.manifestPayload);
    });

    this.connections.onMessage((client, raw) => {
      this.handleMessage(client, raw);
    });

    this.connections.onDisconnect((clientId) => {
      this.feedManager.removeClient(clientId);
    });

    if (this.authResolver) {
      this.connections.onAuthMessage((client, raw) => {
        this.handleAuth(client, raw);
      });
    }

    this.connections.start(options);
  }

  rpc(method: string, handler: RPCHandler): void {
    this.rpcRouter.register(method, handler);
  }

  feed(name: string): FeedHandle {
    return this.feedManager.feed(name);
  }

  async close(): Promise<void> {
    await this.connections.close();
  }

  private handleMessage(client: ClientSocket, raw: string): void {
    let msg: MSTMessage;
    try {
      msg = JSON.parse(raw) as MSTMessage;
    } catch {
      this.sendError(client.id, 'Invalid JSON');
      return;
    }

    if (!msg || typeof msg.type !== 'string') {
      this.sendError(client.id, 'Missing message type');
      return;
    }

    if (isRPCRequest(msg)) {
      this.rpcRouter
        .dispatch(msg, { clientId: client.id })
        .then((response) => this.connections.send(client.id, response))
        .catch(() => this.sendError(client.id, 'Internal server error'));
      return;
    }

    if (isFeedSubscribe(msg)) {
      this.feedManager.subscribe(client.id, msg.feed);
      return;
    }

    if (isFeedUnsubscribe(msg)) {
      this.feedManager.unsubscribe(client.id, msg.feed);
      return;
    }

    this.sendError(client.id, `Unknown message type: "${msg.type}"`);
  }

  private sendError(clientId: string, message: string): void {
    const errorMsg: ErrorMessage = { type: 'error', message };
    this.connections.send(clientId, JSON.stringify(errorMsg));
  }

  private handleAuth(client: ClientSocket, raw: string): void {
    let msg: MSTMessage;
    try {
      msg = JSON.parse(raw) as MSTMessage;
    } catch {
      this.sendAuthResult(client, false, 'Invalid JSON');
      this.connections.rejectClient(client.id, 'Invalid JSON');
      return;
    }

    if (!isAuthMessage(msg)) {
      this.sendAuthResult(client, false, 'Authentication required');
      this.connections.rejectClient(client.id, 'Authentication required');
      return;
    }

    Promise.resolve()
      .then(() => this.authResolver!(msg.credentials))
      .then((result) => {
        if (result) {
          this.sendAuthResult(client, true);
          this.connections.authenticateClient(client.id);
        } else {
          this.sendAuthResult(client, false, 'Authentication failed');
          this.connections.rejectClient(client.id, 'Authentication failed');
        }
      })
      .catch(() => {
        this.sendAuthResult(client, false, 'Authentication error');
        this.connections.rejectClient(client.id, 'Authentication error');
      });
  }

  private sendAuthResult(client: ClientSocket, success: boolean, error?: string): void {
    const msg: AuthResultMessage = { type: 'auth_result', success };
    if (error) msg.error = error;
    this.connections.sendToSocket(client, JSON.stringify(msg));
  }
}
