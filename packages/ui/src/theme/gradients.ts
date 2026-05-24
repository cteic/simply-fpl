/**
 * SimplyFPL Stadium Gradients
 * ---------------------------
 * The teal "matchday" gradient that defines the stadium surface direction.
 * Centralised here so the geometry and colour stops live in one place rather
 * than being copy-pasted (with drifting hex) into every surface.
 *
 * - `stadiumGradient` — the canonical radial used by PageHeader (tone="stadium"),
 *   the live-rank card and as the base of the hero.
 * - `stadiumHeroGradient` — the hero variant, adding a faint pitch-stripe overlay.
 *
 * Stops are sourced from the `stadium*` colour tokens in `colors.ts`.
 */
import { colors } from './colors';

export const stadiumGradient = `radial-gradient(125% 125% at 88% -15%, ${colors.stadium1} 0%, ${colors.stadium2} 42%, ${colors.stadium3} 78%, ${colors.stadium4} 100%)`;

const PITCH_STRIPES = `repeating-linear-gradient(90deg, ${colors.overlay1} 0 2px, transparent 2px 64px)`;

export const stadiumHeroGradient = `${PITCH_STRIPES}, ${stadiumGradient}`;

export const stadiumPitchHeaderGradient = `linear-gradient(90deg, ${colors.stadium2}, ${colors.stadium3})`;

export const stadiumPitchBodyGradient = `linear-gradient(180deg, #F3FAF4, #FFFFFF), repeating-linear-gradient(0deg, rgba(15,118,110,0.045) 0 30px, transparent 30px 60px)`;
