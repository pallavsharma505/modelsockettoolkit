/**
 * MST Server Manifest — describes the server's identity and capabilities.
 * Automatically pushed to every client on first connection.
 */

/** Describes a single argument accepted by a tool */
export interface ToolArgument {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

/** Describes an RPC tool exposed by the server */
export interface ToolDefinition {
  name: string;
  description: string;
  invokeName: string;
  arguments?: ToolArgument[];
}

/** Describes a feed channel the server can push data to */
export interface FeedDefinition {
  name: string;
  description: string;
  listenName: string;
}

/** Full server capability manifest */
export interface ServerManifest {
  serverName: string;
  serverDescription: string;
  tools: ToolDefinition[];
  feeds: FeedDefinition[];
}
