import type { FeedData } from '../shared/protocol';
import type { ConnectionManager } from './ConnectionManager';

export class FeedHandle {
  constructor(
    private name: string,
    private manager: FeedManager,
  ) {}

  emit(data: unknown): void {
    this.manager.emit(this.name, data);
  }
}

export class FeedManager {
  private subscriptions = new Map<string, Set<string>>();

  constructor(private connections: ConnectionManager) {}

  feed(name: string): FeedHandle {
    return new FeedHandle(name, this);
  }

  subscribe(clientId: string, feedName: string): void {
    let subscribers = this.subscriptions.get(feedName);
    if (!subscribers) {
      subscribers = new Set();
      this.subscriptions.set(feedName, subscribers);
    }
    subscribers.add(clientId);
  }

  unsubscribe(clientId: string, feedName: string): void {
    const subscribers = this.subscriptions.get(feedName);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(feedName);
      }
    }
  }

  removeClient(clientId: string): void {
    for (const [feedName, subscribers] of this.subscriptions) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(feedName);
      }
    }
  }

  emit(feedName: string, data: unknown): void {
    const subscribers = this.subscriptions.get(feedName);
    if (!subscribers || subscribers.size === 0) return;

    const message: FeedData = {
      type: 'feed_data',
      feed: feedName,
      data,
    };
    const payload = JSON.stringify(message);
    this.connections.broadcast(subscribers, payload);
  }
}
