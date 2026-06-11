export interface FrankCandidate {
  name: string;
  team: string;
  reason: string;
}

export interface FrankWeeklyPayload {
  gameweek: number;
  generatedAt: string;
  captainCandidates: FrankCandidate[];
  transferTargets: FrankCandidate[];
  chipNote: string | null;
}
