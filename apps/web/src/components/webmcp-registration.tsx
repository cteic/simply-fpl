'use client';

import { useEffect } from 'react';

import { LIVE_RANK_TOOL_DEFINITION, MAX_ENTRY_ID, MIN_ENTRY_ID } from '@/app/mcp/live-rank-tool';
import type { ToolInputSchema } from '@/app/mcp/protocol';

interface WebMcpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface WebMcpToolRegistration {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute(args: Record<string, unknown>): Promise<WebMcpToolResult>;
}

interface WebMcpModelContext {
  registerTool(tool: WebMcpToolRegistration, options?: { signal?: AbortSignal }): Promise<unknown>;
  unregisterTool?(name: string): void;
}

/**
 * `document.modelContext` is the namespace used by the current WebMCP draft
 * (W3C Web Machine Learning Community Group Report, Aug 2026). Older tutorials
 * use `navigator.modelContext`; that name is superseded.
 */
function readModelContext(): WebMcpModelContext | null {
  if (typeof document === 'undefined') return null;
  if (!('modelContext' in document)) return null;
  const candidate: unknown = Reflect.get(document, 'modelContext');
  if (typeof candidate !== 'object' || candidate === null) return null;
  if (!('registerTool' in candidate)) return null;
  const registerTool: unknown = Reflect.get(candidate, 'registerTool');
  if (typeof registerTool !== 'function') return null;
  return { registerTool: registerTool.bind(candidate) };
}

export function toEntryId(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed)) return null;
  if (parsed < MIN_ENTRY_ID || parsed > MAX_ENTRY_ID) return null;
  return parsed;
}

async function callLiveRank(args: Record<string, unknown>): Promise<WebMcpToolResult> {
  const entryId = toEntryId(args['entryId']);
  if (entryId === null) {
    return {
      content: [{ type: 'text', text: 'entryId must be a positive integer FPL team id.' }],
      isError: true,
    };
  }
  const res = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: LIVE_RANK_TOOL_DEFINITION.name, arguments: { entryId } },
    }),
  });
  const body: unknown = await res.json();
  if (typeof body === 'object' && body !== null && 'result' in body) {
    const { result } = body;
    if (typeof result === 'object' && result !== null && 'content' in result) {
      const { content } = result;
      if (Array.isArray(content)) {
        return { content: content.filter(isTextContent) };
      }
    }
  }
  return { content: [{ type: 'text', text: 'Live rank lookup failed.' }], isError: true };
}

function isTextContent(value: unknown): value is { type: 'text'; text: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'text' &&
    'text' in value &&
    typeof value.text === 'string'
  );
}

/**
 * Progressive enhancement only: WebMCP is a pre-standard draft with no shipping
 * browser, so this component is inert unless the browser exposes the API.
 */
export function WebMcpRegistration() {
  useEffect(() => {
    const modelContext = readModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    void modelContext
      .registerTool(
        {
          name: LIVE_RANK_TOOL_DEFINITION.name,
          description: LIVE_RANK_TOOL_DEFINITION.description,
          inputSchema: LIVE_RANK_TOOL_DEFINITION.inputSchema,
          execute: callLiveRank,
        },
        { signal: controller.signal }
      )
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return null;
}
