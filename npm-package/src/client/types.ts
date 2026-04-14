export type FeedCallback = (data: unknown) => void;

export interface MSTClientOptions {
  url: string;
  auth?: Record<string, string>;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface PendingRPC {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
