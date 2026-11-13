import { SITE_NAME } from '@/lib/site-url';

import { UPSTREAM_TIMEOUT_MS, createLiveRankTool, createTimeoutFetchJson } from './live-rank-tool';
import {
  JSON_RPC_ERROR_CODES,
  MCP_PROTOCOL_VERSION,
  type McpTool,
  handleJsonRpc,
  jsonRpcError,
} from './protocol';

const MAX_BODY_BYTES = 16 * 1024;
const SERVER_VERSION = '1.0.0';
const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version',
} as const;

function buildTools(): McpTool[] {
  return [
    createLiveRankTool({
      apiBaseUrl: API_BASE_URL,
      fetchJson: createTimeoutFetchJson(UPSTREAM_TIMEOUT_MS),
    }),
  ];
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export function GET(): Response {
  return Response.json(
    {
      name: `${SITE_NAME} MCP server`,
      protocolVersion: MCP_PROTOCOL_VERSION,
      transport: 'streamable-http',
      usage: 'POST a JSON-RPC 2.0 message to this endpoint.',
      methods: ['initialize', 'ping', 'tools/list', 'tools/call'],
      tools: buildTools().map((tool) => tool.definition.name),
    },
    { headers: JSON_HEADERS }
  );
}

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json(
      jsonRpcError(null, JSON_RPC_ERROR_CODES.invalidRequest, 'Request body too large'),
      { status: 413, headers: JSON_HEADERS }
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json(
      jsonRpcError(null, JSON_RPC_ERROR_CODES.invalidRequest, 'Request body too large'),
      { status: 413, headers: JSON_HEADERS }
    );
  }

  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return Response.json(
      jsonRpcError(null, JSON_RPC_ERROR_CODES.parseError, 'Request body is not valid JSON'),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const response = await handleJsonRpc(message, {
    serverName: `${SITE_NAME} MCP server`,
    serverVersion: SERVER_VERSION,
    tools: buildTools(),
  });

  if (response === null) {
    return new Response(null, { status: 202, headers: JSON_HEADERS });
  }

  return Response.json(response, { headers: JSON_HEADERS });
}
