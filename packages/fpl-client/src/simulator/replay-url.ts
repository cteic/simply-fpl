export interface ReplayWsUrlOptions {
  apiUrl: string;
  gw: number;
  recordingId: string;
  speed?: number;
}

export function buildReplayWsUrl({
  apiUrl,
  gw,
  recordingId,
  speed = 1,
}: ReplayWsUrlOptions): string {
  const wsBase = apiUrl
    .replace(/^http:\/\//i, 'ws://')
    .replace(/^https:\/\//i, 'wss://')
    .replace(/\/$/, '');
  const params = new URLSearchParams({
    gw: String(gw),
    replay: recordingId,
    speed: String(speed),
  });
  return `${wsBase}/live/ws?${params.toString()}`;
}
