import {
  type MSTMessage,
  type ErrorMessage,
  type ServerManifestMessage,
  isRPCRequest,
  isFeedSubscribe,
  isFeedUnsubscribe,
} from '../shared/protocol';
import { ConnectionManager } from './ConnectionManager';
import { RPCRouter } from './RPCRouter';
import { FeedManager, FeedHandle } from './FeedManager';
import type { MSTServerOptions, RPCHandler, ClientSocket } from './types';

export class MSTServer {
  private connections: ConnectionManager;
  private rpcRouter: RPCRouter;
  private feedManager: FeedManager;
  private readonly manifestPayload: string;

  constructor(options: MSTServerOptions) {
    this.connections = new ConnectionManager(options);
    this.rpcRouter = new RPCRouter();
    this.feedManager = new FeedManager(this.connections);

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
}
