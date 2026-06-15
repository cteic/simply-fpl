import { useCallback, useState } from 'react';

import { simulateWhatIf } from '@simplyfpl/fpl-client';
import type { WhatIfResult, WhatIfSwap } from '@simplyfpl/fpl-client';
import type { FplBootstrapStatic, FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

export type { WhatIfResult, WhatIfSwap };

export interface UseWhatIfSimulationInput {
  picks: FplEntryGameweekPicks | null | undefined;
  liveGw: FplLiveGameweek | null | undefined;
  bootstrap: FplBootstrapStatic | null | undefined;
  preGwRank: number;
  currentLivePoints: number;
  avgEntryScore: number;
}

export interface UseWhatIfSimulationResult {
  result: WhatIfResult | null;
  activeSwap: WhatIfSwap | null;
  simulate: (swap: WhatIfSwap) => void;
  reset: () => void;
}

export function useWhatIfSimulation({
  picks,
  liveGw,
  bootstrap,
  preGwRank,
  currentLivePoints,
  avgEntryScore,
}: UseWhatIfSimulationInput): UseWhatIfSimulationResult {
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [activeSwap, setActiveSwap] = useState<WhatIfSwap | null>(null);

  const simulate = useCallback(
    (swap: WhatIfSwap) => {
      if (!picks || !liveGw || !bootstrap) {
        setResult(null);
        setActiveSwap(null);
        return;
      }
      const computed = simulateWhatIf(
        picks,
        liveGw,
        bootstrap,
        swap,
        preGwRank,
        avgEntryScore,
        currentLivePoints
      );
      setResult(computed);
      setActiveSwap(swap);
    },
    [picks, liveGw, bootstrap, preGwRank, avgEntryScore, currentLivePoints]
  );

  const reset = useCallback(() => {
    setResult(null);
    setActiveSwap(null);
  }, []);

  return { result, activeSwap, simulate, reset };
}
