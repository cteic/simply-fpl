const DEFAULT_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ??
  process.env['EXPO_PUBLIC_API_URL'] ??
  'http://localhost:8787';

export interface KitUrlOptions {
  isGoalkeeper?: boolean;
  size?: 110 | 220;
  baseUrl?: string;
}

export function getKitUrl(teamCode: number, opts: KitUrlOptions = {}): string {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const size = opts.size ?? 110;
  const prefix = opts.isGoalkeeper ? 'gk-' : '';
  return `${baseUrl}/kits/${prefix}${teamCode}-${size}.webp`;
}
