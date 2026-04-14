import type { WebSocket } from 'ws';
import type { ServerManifest } from '../shared/manifest';

export interface ClientSocket {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
}

export type AuthResolver = (
  credentials: Record<string, string>,
) => boolean | Promise<boolean>;

export interface MSTServerOptions {
  port: number;
  manifest: ServerManifest;
  authResolver?: AuthResolver;
  authTimeout?: number;
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
