import {
  type RPCRequest,
  type RPCResponse,
  type FeedSubscribe,
  type FeedUnsubscribe,
  type FeedData,
  type MSTMessage,
  type ServerManifestMessage,
  type AuthMessage,
  isRPCResponse,
  isFeedData,
  isServerManifest,
  isAuthResult,
  isErrorMessage,
} from '../shared/protocol';
import type { ServerManifest } from '../shared/manifest';
import type { FeedCallback, MSTClientOptions, PendingRPC } from './types';
import { randomUUID } from 'crypto';

export class MSTClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRPC>();
  private feeds = new Map<string, Set<FeedCallback>>();
  private _manifest: ServerManifest | null = null;
  private manifestCallback: ((m: ServerManifest) => void) | null = null;
  private errorCallback: ((msg: string) => void) | null = null;
  private disconnectCallback: ((error?: string) => void) | null = null;
  private reconnectAttempts = 0;
  private _disableReconnect = false;

  private readonly url: string;
  private readonly auth?: Record<string, string>;
  private readonly reconnect: boolean;
  private readonly reconnectInterval: number;
  private readonly maxReconnectAttempts: number;

  constructor(options: MSTClientOptions) {
    this.url = options.url;
    this.auth = options.auth;
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval ?? 3_000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  get manifest(): ServerManifest | null {
    return this._manifest;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.auth) {
          const authMsg: AuthMessage = { type: 'auth', credentials: this.auth };
          this.ws!.send(JSON.stringify(authMsg));
        }
        resolve();
      };

      this.ws.onerror = (event) => {
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.handleClose();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(String(event.data));
      };
    });
  }

  async call(method: string, payload?: unknown, timeout = 30_000): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = randomUUID();
    const request: RPCRequest = {
      type: 'rpc_req',
      id,
      method,
      payload: payload ?? null,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: "${method}"`));
      }, timeout);

      this.pending.set(id, { resolve, reject, timer });
      this.ws!.send(JSON.stringify(request));
    });
  }

  subscribe(feedName: string, callback: FeedCallback): () => void {
    let callbacks = this.feeds.get(feedName);
    if (!callbacks) {
      callbacks = new Set();
      this.feeds.set(feedName, callbacks);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const msg: FeedSubscribe = { type: 'feed_sub', feed: feedName };
        this.ws.send(JSON.stringify(msg));
      }
    }

    callbacks.add(callback);

    return () => {
      callbacks!.delete(callback);
      if (callbacks!.size === 0) {
        this.feeds.delete(feedName);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const msg: FeedUnsubscribe = { type: 'feed_unsub', feed: feedName };
          this.ws.send(JSON.stringify(msg));
        }
      }
    };
  }

  onManifest(callback: (manifest: ServerManifest) => void): void {
    this.manifestCallback = callback;
    if (this._manifest) {
      callback(this._manifest);
    }
  }

  onError(callback: (message: string) => void): void {
    this.errorCallback = callback;
  }

  onDisconnect(callback: (error?: string) => void): void {
    this.disconnectCallback = callback;
  }

  close(): void {
    this._disableReconnect = true;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Client closed'));
    }
    this.pending.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(raw: string): void {
    let msg: MSTMessage;
    try {
      msg = JSON.parse(raw) as MSTMessage;
    } catch {
      return;
    }

    if (isRPCResponse(msg)) {
      const pending = this.pending.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.data);
        }
      }
      return;
    }

    if (isFeedData(msg)) {
      const callbacks = this.feeds.get(msg.feed);
      if (callbacks) {
        for (const cb of callbacks) {
          cb(msg.data);
        }
      }
      return;
    }

    if (isServerManifest(msg)) {
      this._manifest = msg.manifest;
      this.manifestCallback?.(msg.manifest);
      return;
    }

    if (isAuthResult(msg)) {
      if (!msg.success) {
        this._disableReconnect = true;
        this.disconnectCallback?.(msg.error ?? 'Authentication failed');
      }
      return;
    }

    if (isErrorMessage(msg)) {
      this.errorCallback?.(msg.message);
      return;
    }
  }

  private handleClose(): void {
    this.disconnectCallback?.();
    if (
      this.reconnect &&
      !this._disableReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(() => {});
      }, this.reconnectInterval);
    }
  }
}
