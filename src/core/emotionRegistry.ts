// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Emotion Registry
//
// Single source of truth for all emotion scores, tier multipliers, derivatives,
// and blend emotions. All scores are computed from base values and multipliers
// to ensure consistency — never hand-entered independently.
//
// Plutchik opposing pairs (symmetrically scored):
//   Joy      (+1.00)  ↔  Sadness      (-1.00)
//   Trust    (+0.80)  ↔  Disgust      (-0.80)
//   Fear     (-0.70)  ↔  Anger        (-0.70)  [weakest negative pair]
//   Anticipation (+0.50) ↔ Surprise   (±0.50)  [most transitional pair]
//
// Tier multipliers:  mild = 0.60 | core = 1.00 | intense = 1.30
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CoreEmotion,
  EmotionTier,
  DerivativeEmotion,
  BlendEmotion,
} from './types';

// ── TIER MULTIPLIERS ─────────────────────────────────────────────────────────

export const TIER_MULTIPLIERS: Record<EmotionTier, number> = {
  mild:    0.60,
  core:    1.00,
  intense: 1.30,
} as const;

// ── BASE SCORES ───────────────────────────────────────────────────────────────
// Opposing pairs are strictly mirrored.

export const BASE_SCORES: Record<CoreEmotion, number> = {
  Joy:          +1.00,
  Trust:        +0.80,
  Anticipation: +0.50,
  Surprise:     +0.50,  // treated as ±; sign may be user-context-dependent in future
  Fear:         -0.70,
  Sadness:      -1.00,
  Disgust:      -0.80,
  Anger:        -0.70,
} as const;

// ── DERIVATIVE REGISTRY ──────────────────────────────────────────────────────
// Each core emotion has exactly 3 derivatives (mild, core, intense).
// tierScore = round(baseScore × multiplier, 2)

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function makeDerivatives(
  coreEmotion: CoreEmotion,
  mildName: string,
  coreName: string,
  intenseName: string,
): DerivativeEmotion[] {
  const base = BASE_SCORES[coreEmotion];
  return [
    { name: mildName,    coreEmotion, tier: 'mild',    tierScore: round2(base * TIER_MULTIPLIERS.mild) },
    { name: coreName,    coreEmotion, tier: 'core',    tierScore: round2(base * TIER_MULTIPLIERS.core) },
    { name: intenseName, coreEmotion, tier: 'intense', tierScore: round2(base * TIER_MULTIPLIERS.intense) },
  ];
}

export const DERIVATIVES: DerivativeEmotion[] = [
  ...makeDerivatives('Joy',          'Serenity',     'Joy',          'Ecstasy'),
  ...makeDerivatives('Trust',        'Acceptance',   'Trust',        'Admiration'),
  ...makeDerivatives('Anticipation', 'Interest',     'Anticipation', 'Vigilance'),
  ...makeDerivatives('Surprise',     'Distraction',  'Surprise',     'Amazement'),
  ...makeDerivatives('Fear',         'Apprehension', 'Fear',         'Terror'),
  ...makeDerivatives('Sadness',      'Pensiveness',  'Sadness',      'Grief'),
  ...makeDerivatives('Disgust',      'Boredom',      'Disgust',      'Loathing'),
  ...makeDerivatives('Anger',        'Annoyance',    'Anger',        'Rage'),
];

// ── DERIVATIVE LOOKUP ────────────────────────────────────────────────────────

/**
 * Look up a derivative by core emotion + tier.
 * Returns undefined if not found (callers should validate inputs first).
 */
export function getDerivative(
  coreEmotion: CoreEmotion,
  tier: EmotionTier,
): DerivativeEmotion | undefined {
  return DERIVATIVES.find(
    d => d.coreEmotion === coreEmotion && d.tier === tier,
  );
}

/**
 * Get the tier score for a core emotion + tier combination.
 * Throws if the combination is not found — this indicates a programming error,
 * not a user error, so a hard failure is appropriate.
 */
export function getTierScore(coreEmotion: CoreEmotion, tier: EmotionTier): number {
  const derivative = getDerivative(coreEmotion, tier);
  if (!derivative) {
    throw new Error(
      `No derivative found for coreEmotion="${coreEmotion}" tier="${tier}". ` +
      `This is a programming error — check that inputs are validated before calling getTierScore.`,
    );
  }
  return derivative.tierScore;
}

// ── BLEND EMOTIONS ────────────────────────────────────────────────────────────
// Sit between two adjacent primaries. Score = average of the two parent base scores.

function makeBlend(
  name: string,
  parentA: CoreEmotion,
  parentB: CoreEmotion,
  description: string,
): BlendEmotion {
  return {
    name,
    parentA,
    parentB,
    blendScore: round2((BASE_SCORES[parentA] + BASE_SCORES[parentB]) / 2),
    description,
  };
}

export const BLEND_EMOTIONS: BlendEmotion[] = [
  makeBlend('Love',           'Joy',          'Trust',        'Deep affection, warmth, belonging'),
  makeBlend('Optimism',       'Joy',          'Anticipation', 'Hopeful expectation, positive outlook'),
  makeBlend('Submission',     'Trust',        'Fear',         'Deference, vulnerability within trust'),
  makeBlend('Awe',            'Fear',         'Surprise',     'Overwhelming wonder, reverence'),
  makeBlend('Disapproval',    'Surprise',     'Sadness',      'Disappointment, mild rejection'),
  makeBlend('Remorse',        'Sadness',      'Disgust',      'Guilt, regret, self-directed shame'),
  makeBlend('Contempt',       'Disgust',      'Anger',        'Disdain, superiority mixed with aversion'),
  makeBlend('Aggressiveness', 'Anger',        'Anticipation', 'Driven assertiveness, competitive energy'),
];

// ── VALIDATION HELPERS ────────────────────────────────────────────────────────

export const CORE_EMOTIONS: readonly CoreEmotion[] = [
  'Joy', 'Trust', 'Anticipation', 'Surprise',
  'Fear', 'Sadness', 'Disgust', 'Anger',
] as const;

export const EMOTION_TIERS: readonly EmotionTier[] = ['mild', 'core', 'intense'] as const;

export function isCoreEmotion(value: string): value is CoreEmotion {
  return (CORE_EMOTIONS as readonly string[]).includes(value);
}

export function isEmotionTier(value: string): value is EmotionTier {
  return (EMOTION_TIERS as readonly string[]).includes(value);
}

/** Intensity must be an integer from 1 to 10 inclusive */
export function isValidIntensity(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}
