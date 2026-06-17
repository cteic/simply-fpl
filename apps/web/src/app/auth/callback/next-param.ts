export function sanitizeNextParam(raw: string | null): string {
  const cleaned = (raw ?? '').replace(/[\x00-\x1f\x7f]/g, '');
  if (cleaned.startsWith('/') && !cleaned.startsWith('//') && !cleaned.startsWith('/\\')) {
    return cleaned;
  }
  return '/leagues';
}
