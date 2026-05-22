export type HomeChoice = 'search' | { entryId: number };

export interface HomeChoiceInput {
  /** `?clear=1` — deselect the saved team. */
  clear: boolean;
  /** `?change=1` — force the search form without clearing. */
  forceForm: boolean;
  /** The saved entry id, or null when none/invalid. */
  savedId: number | null;
}

export interface HomeChoiceResult {
  choice: HomeChoice;
  clearStorage: boolean;
}

/**
 * Decides what the home route shows. `clear` wins (deselect → forget the
 * saved team and show search); then an explicit `change`; then a saved team;
 * otherwise the search form.
 */
export function resolveHomeChoice({
  clear,
  forceForm,
  savedId,
}: HomeChoiceInput): HomeChoiceResult {
  if (clear) return { choice: 'search', clearStorage: true };
  if (forceForm) return { choice: 'search', clearStorage: false };
  if (savedId !== null) return { choice: { entryId: savedId }, clearStorage: false };
  return { choice: 'search', clearStorage: false };
}
