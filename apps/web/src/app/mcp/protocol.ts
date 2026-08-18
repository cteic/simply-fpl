export const MCP_PROTOCOL_VERSION = '2026-07-28';

export const JSON_RPC_ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcErrorBody {
  code: number;
  message: string;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: JsonRpcErrorBody;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: Record<string, unknown>;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface ToolContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  additionalProperties: false;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface McpTool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== 'object' || value === null) return false;
  if (!('jsonrpc' in value) || value.jsonrpc !== '2.0') return false;
  if (!('method' in value) || typeof value.method !== 'string') return false;
  if ('id' in value) {
    const { id } = value;
    if (typeof id !== 'string' && typeof id !== 'number' && id !== null) return false;
  }
  if ('params' in value && value.params !== undefined) {
    if (typeof value.params !== 'object' || value.params === null || Array.isArray(value.params)) {
      return false;
    }
  }
  return true;
}

export function jsonRpcError(id: JsonRpcId, code: number, message: string): JsonRpcErrorResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

export function jsonRpcSuccess(
  id: JsonRpcId,
  result: Record<string, unknown>
): JsonRpcSuccessResponse {
  return { jsonrpc: '2.0', id, result };
}

function readToolCallParams(
  params: Record<string, unknown> | undefined
): { name: string; args: Record<string, unknown> } | null {
  if (!params) return null;
  const name = params['name'];
  if (typeof name !== 'string' || name.length === 0) return null;
  const rawArgs = params['arguments'];
  if (rawArgs === undefined || rawArgs === null) return { name, args: {} };
  if (typeof rawArgs !== 'object' || Array.isArray(rawArgs)) return null;
  const args: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawArgs)) {
    args[key] = value;
  }
  return { name, args };
}

export interface HandleJsonRpcOptions {
  serverName: string;
  serverVersion: string;
  tools: readonly McpTool[];
}

/**
 * Dispatch a single JSON-RPC 2.0 message. Returns `null` for notifications
 * (messages with no `id`), which per JSON-RPC must not be answered.
 */
export async function handleJsonRpc(
  message: unknown,
  { serverName, serverVersion, tools }: HandleJsonRpcOptions
): Promise<JsonRpcResponse | null> {
  if (!isJsonRpcRequest(message)) {
    return jsonRpcError(
      null,
      JSON_RPC_ERROR_CODES.invalidRequest,
      'Invalid JSON-RPC 2.0 request envelope'
    );
  }

  const id = message.id ?? null;
  const isNotification = message.id === undefined;

  if (message.method === 'initialize') {
    if (isNotification) return null;
    return jsonRpcSuccess(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: serverName, version: serverVersion },
    });
  }

  if (message.method === 'ping') {
    if (isNotification) return null;
    return jsonRpcSuccess(id, {});
  }

  if (message.method.startsWith('notifications/')) {
    return null;
  }

  if (message.method === 'tools/list') {
    if (isNotification) return null;
    return jsonRpcSuccess(id, { tools: tools.map((tool) => tool.definition) });
  }

  if (message.method === 'tools/call') {
    if (isNotification) return null;
    const parsed = readToolCallParams(message.params);
    if (parsed === null) {
      return jsonRpcError(
        id,
        JSON_RPC_ERROR_CODES.invalidParams,
        'tools/call requires a string `name` and an object `arguments`'
      );
    }
    const tool = tools.find((candidate) => candidate.definition.name === parsed.name);
    if (!tool) {
      return jsonRpcError(id, JSON_RPC_ERROR_CODES.invalidParams, `Unknown tool: ${parsed.name}`);
    }
    try {
      const result = await tool.execute(parsed.args);
      return jsonRpcSuccess(id, { content: result.content, isError: result.isError === true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      return jsonRpcError(
        id,
        JSON_RPC_ERROR_CODES.internalError,
        `Tool execution failed: ${detail}`
      );
    }
  }

  if (isNotification) return null;
  return jsonRpcError(
    id,
    JSON_RPC_ERROR_CODES.methodNotFound,
    `Method not found: ${message.method}`
  );
}
