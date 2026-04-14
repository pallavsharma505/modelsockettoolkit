import type { WebSocket } from 'ws';
import type { ServerManifest } from '../shared/manifest';

export interface ClientSocket {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
}

export interface MSTServerOptions {
  port: number;
  manifest: ServerManifest;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  maxPayloadSize?: number;
}

export interface RPCContext {
  clientId: string;
}

export type RPCHandler = (
  payload: unknown,
  context: RPCContext,
) => unknown | Promise<unknown>;
