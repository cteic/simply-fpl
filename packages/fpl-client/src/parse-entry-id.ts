/**
 * Parse an FPL entry (team) id from raw user input.
 *
 * Accepts a bare numeric id ("1234567") or a pasted FPL team URL
 * (".../entry/1234567/event/30"). Returns null when no valid positive
 * integer id can be extracted. Pure — safe for web and native.
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
