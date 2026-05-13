export type Position = 'gk' | 'def' | 'mid' | 'fwd';

export interface PlayerSeed {
  id: number;
  webName: string;
  teamShort: string;
  position: Position;
  totalPoints: number;
  form: number;
  /** Default x/z on the pitch (centred at origin). */
  defaultX: number;
  defaultZ: number;
}

export interface PlayerPos {
  x: number;
  z: number;
}

export interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
}
