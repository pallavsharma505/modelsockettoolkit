import type { RPCRequest, RPCResponse } from '../shared/protocol';
import type { RPCHandler, RPCContext } from './types';

export class RPCRouter {
  private handlers = new Map<string, RPCHandler>();

  register(method: string, handler: RPCHandler): void {
    if (this.handlers.has(method)) {
      throw new Error(`RPC handler already registered for method "${method}"`);
    }
    this.handlers.set(method, handler);
  }

  async dispatch(request: RPCRequest, context: RPCContext): Promise<string> {
    const handler = this.handlers.get(request.method);

    if (!handler) {
      const response: RPCResponse = {
        type: 'rpc_res',
        id: request.id,
        error: `Unknown RPC method: "${request.method}"`,
      };
      return JSON.stringify(response);
    }

    try {
      const result = await handler(request.payload, context);
      const response: RPCResponse = {
        type: 'rpc_res',
        id: request.id,
        data: result,
        error: null,
      };
      return JSON.stringify(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      const response: RPCResponse = {
        type: 'rpc_res',
        id: request.id,
        error: message,
      };
      return JSON.stringify(response);
    }
  }
}
