// Scout inbox events (#486 thin slice). Events are tone-neutral structured
// data — headline copy is a presentation concern, so the gaffer/dry tone
// decision can land later without touching the domain layer.
export type ScoutEventKind =
  | 'injury'
  | 'doubt'
  | 'suspension'
  | 'unavailable'
  | 'price_fall'
  | 'price_rise';

export type ScoutEventSeverity = 'bad' | 'warn' | 'good';

export interface ScoutPlayerRef {
  id: number;
  webName: string;
  teamShortName: string;
  elementType: number;
  nowCost: number;
}

export interface ScoutEvent {
  id: string;
  kind: ScoutEventKind;
  severity: ScoutEventSeverity;
  player: ScoutPlayerRef;
  news: string | null;
  chanceOfPlaying: number | null;
  probability: number | null;
  netTransfers: number | null;
}
