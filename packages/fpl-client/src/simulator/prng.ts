export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeightedIndex(weights: number[], roll: number): number {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return 0;
  let threshold = roll * total;
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    if (weight === undefined) continue;
    threshold -= weight;
    if (threshold < 0) return i;
  }
  return weights.length - 1;
}
