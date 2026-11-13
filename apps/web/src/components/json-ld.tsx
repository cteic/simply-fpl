import type { StructuredDataNode } from '@/lib/structured-data';

export function serializeJsonLd(nodes: readonly StructuredDataNode[]): string {
  const payload = nodes.length === 1 ? nodes[0] : nodes;
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

interface JsonLdProps {
  nodes: readonly StructuredDataNode[];
}

export function JsonLd({ nodes }: JsonLdProps) {
  if (nodes.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(nodes) }}
    />
  );
}
