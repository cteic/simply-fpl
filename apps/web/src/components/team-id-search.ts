/**
 * Pure helpers for the team-ID search box: parse what the user typed (a raw
 * ID or a pasted FPL URL) and confirm the team actually exists before we send
 * them to a dashboard for it.
 */

export function parseEntryId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const fromUrl = trimmed.match(/entry\/(\d+)/i)?.[1];
  if (fromUrl) {
    const parsed = Number(fromUrl);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

type EntryLookupStatus = 'found' | 'not-found' | 'error';

export interface EntryLookupResult {
  status: EntryLookupStatus;
}

/**
 * Resolves whether an entry exists. The FPL proxy returns 404 for unknown
 * teams (surfaced as a "FPL API error: 404 …" Error by the client), which we
 * map to 'not-found'; any other failure is a transient 'error'.
 */
export async function lookupEntry(
  entryId: number,
  getEntry: (id: number) => Promise<unknown>
): Promise<EntryLookupResult> {
  try {
    await getEntry(entryId);
    return { status: 'found' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const statusMatch = message.match(/FPL API error: (\d+)/);
    if (statusMatch && statusMatch[1] === '404') return { status: 'not-found' };
    return { status: 'error' };
  }
}
