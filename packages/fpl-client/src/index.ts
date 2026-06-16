export { createFplClient, fplClient } from './client';
export { computeDefConProgress, computeSeasonDefConRate } from './defcon';
export type { SeasonDefConRate } from './defcon';
export {
  APPROX_TOTAL_FPL_ENTRIES,
  buildLiveLeagueTable,
  calculateLivePoints,
  computeRankDetails,
  estimateLiveRank,
  estimateLiveRankSmart,
  formatTimeRemaining,
  getCurrentGameweek,
  getNextDeadline,
  getNextGameweek,
} from './live-rank';
export type {
  EstimateLiveRankSmartOptions,
  LiveRankEstimate,
  NextDeadline,
  RankDetails,
} from './live-rank';
export { formatPrice, predictPriceChanges } from './price-changes';
export { computeScoreDistribution } from './score-distribution';
export type { ScoreDistributionOptions } from './score-distribution';
export {
  DistributionUnavailableError,
  estimateLiveRankFromDistribution,
  estimateRankFromScore,
  hasDistribution,
  loadDistribution,
  scoreToPercentile,
} from './estimate-rank';
export type { DistributionRankEstimate, LoadDistributionOptions } from './estimate-rank';
export { DISTRIBUTION_GAMEWEEKS } from './score-distributions/distributions.generated';
export { buildSlimBootstrap } from './slim-bootstrap';
export { buildSlimFixtures } from './slim-fixtures';
export { buildSlimLeague } from './slim-league';
export { parseEntryId } from './parse-entry-id';
export { getKitUrl } from './kits';
export type { KitUrlOptions } from './kits';
export { getClubColor } from './club-colors';
export { predictBonusPoints } from './bonus-points';
export type { BonusPrediction } from './bonus-points';
export { applyAutosubs } from './autosubs';
export { simulateWhatIf } from './what-if-simulator';
export type { WhatIfResult, WhatIfSwap, WhatIfSwapType } from './what-if-simulator';
export {
  buildSamples,
  buildSamplesForEntry,
  RANK_BANDS,
  replayArchive,
  scoreSample,
} from './rank-accuracy/replay-archive';
export type {
  ArchiveBootstrap,
  ArchiveEntry,
  ArchiveGwHistory,
  BandStats,
  PointsMode,
  RankBand,
  ReplayResult,
  ReplaySample,
  ScoredSample,
} from './rank-accuracy/replay-archive';
export { mulberry32, pickWeightedIndex } from './simulator/prng';
export {
  isRecordingRow,
  normaliseRecordingRows,
  parseRecording,
  recordingElapsedSeconds,
  recordingToJsonl,
} from './simulator/recording';
export type { RecordingRow } from './simulator/recording';
export {
  DEF_TYPE,
  FWD_TYPE,
  GK_TYPE,
  MID_TYPE,
  buildManagerPool,
  expandManager,
} from './simulator/manager-pool';
export type {
  BuildManagerPoolArgs,
  CompactManager,
  Formation,
  ManagerDistribution,
  SquadPlayer,
} from './simulator/manager-pool';
export {
  buildExpectedCurve,
  findFrameNearElapsed,
  meanScore,
  scorePoolFrame,
} from './simulator/expected-curve';
export type {
  BuildExpectedCurveArgs,
  ExpectedCurve,
  ExpectedCurvePoint,
} from './simulator/expected-curve';
