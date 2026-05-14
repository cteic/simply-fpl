export interface CohortSnapshot {
  cohortName: 'top10k' | 'overall' | 'top25k';
  gameweek: number;
  capturedAt: string;
  sampleSize: number;
  averageScore: number;
  averagePlayersPlayed: number;
  averageBudgetUsed: number;
  averageCaptainPoints: number;
  playerOwnership: Record<number, number>;
  captainOwnership: Record<number, number>;
  topThreshold: number;
}

export interface CohortWip {
  cohortName: CohortSnapshot['cohortName'];
  gameweek: number;
  startedAt: string;
  remainingIds: number[];
  processedCount: number;
  playerOwnerCount: Record<number, number>;
  captainOwnerCount: Record<number, number>;
  totalScore: number;
  totalPlayersPlayed: number;
  totalCaptainPoints: number;
  topThreshold: number;
}
