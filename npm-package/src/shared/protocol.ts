/**
 * MST Wire Protocol — message types sent over the WebSocket connection.
 */

import type { ServerManifest } from './manifest';

export type MessageType =
  | 'rpc_req'
  | 'rpc_res'
  | 'feed_sub'
  | 'feed_unsub'
  | 'feed_data'
  | 'server_manifest'
  | 'error';

export interface RPCRequest {
  type: 'rpc_req';
  id: string;
  method: string;
  payload?: unknown;
}

export interface RPCResponse {
  type: 'rpc_res';
  id: string;
  data?: unknown;
  error?: string | null;
}

export interface FeedSubscribe {
  type: 'feed_sub';
  feed: string;
}

export interface FeedUnsubscribe {
  type: 'feed_unsub';
  feed: string;
}

export interface FeedData {
  type: 'feed_data';
  feed: string;
  data: unknown;
}

export interface ServerManifestMessage {
  type: 'server_manifest';
  manifest: ServerManifest;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type MSTMessage =
  | RPCRequest
  | RPCResponse
  | FeedSubscribe
  | FeedUnsubscribe
  | FeedData
  | ServerManifestMessage
  | ErrorMessage;

// ── Type Guards ──────────────────────────────────────────────────────────────

export function isRPCRequest(msg: MSTMessage): msg is RPCRequest {
  return msg.type === 'rpc_req';
}

export function isRPCResponse(msg: MSTMessage): msg is RPCResponse {
  return msg.type === 'rpc_res';
}

export function isFeedSubscribe(msg: MSTMessage): msg is FeedSubscribe {
  return msg.type === 'feed_sub';
}

export function isFeedUnsubscribe(msg: MSTMessage): msg is FeedUnsubscribe {
  return msg.type === 'feed_unsub';
}

export function isFeedData(msg: MSTMessage): msg is FeedData {
  return msg.type === 'feed_data';
}

export function isServerManifest(msg: MSTMessage): msg is ServerManifestMessage {
  return msg.type === 'server_manifest';
}

export function isErrorMessage(msg: MSTMessage): msg is ErrorMessage {
  return msg.type === 'error';
}
