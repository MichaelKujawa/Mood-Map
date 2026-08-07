// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Scoring Engine
//
// Pure functions. No side effects. No imports from React or AsyncStorage.
// Every function is unit-testable in isolation.
//
// Formula:
//   weightedScore  = tierScore × intensity           (per emotion)
//   totalWeighted  = Σ(weightedScore)                (across all emotions)
//   totalIntensity = Σ(intensity)                    (across all emotions)
//   dailyScore     = (totalWeighted / totalIntensity) × 10
//
// Score range: -10.00 to +10.00, rounded to 2 decimal places.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EmotionInput,
  ScoredEmotion,
  DailyScoreResult,
  ScoreLabel,
  EntryRecord,
  PatternCheckResult,
} from './types';

import {
  getTierScore,
  isCoreEmotion,
  isEmotionTier,
  isValidIntensity,
} from './emotionRegistry';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

/** Minimum entries per month to qualify for pattern detection */
const PATTERN_MIN_MONTHLY_AVG = 10;

/** Minimum months of data required for pattern detection */
const PATTERN_MIN_MONTHS = 12;

/** Minimum total entries required (avg × months) */
const PATTERN_MIN_TOTAL = PATTERN_MIN_MONTHLY_AVG * PATTERN_MIN_MONTHS; // 120

/**
 * How many points below the annual average a month's score must be
 * to trigger a pattern alert.
 */
const PATTERN_ALERT_THRESHOLD = 1.5;

// ── HELPERS ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── INPUT VALIDATION ─────────────────────────────────────────────────────────

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Validates a single EmotionInput before scoring.
 * Returns all errors found, not just the first.
 */
export function validateEmotionInput(input: EmotionInput): ValidationResult {
  const errors: string[] = [];

  if (!isCoreEmotion(input.coreEmotion)) {
    errors.push(`Invalid coreEmotion: "${input.coreEmotion}"`);
  }

  if (!isEmotionTier(input.tier)) {
    errors.push(`Invalid tier: "${input.tier}"`);
  }

  if (!input.derivative || input.derivative.trim().length === 0) {
    errors.push('derivative must not be empty');
  }

  if (!isValidIntensity(input.intensity)) {
    errors.push(
      `intensity must be an integer from 1 to 10. Received: ${input.intensity}`,
    );
  }

  if (!input.journalNote || input.journalNote.trim().length === 0) {
    errors.push('journalNote must not be empty');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a full session input (1 or more emotions).
 * A session must have at least one emotion.
 */
export function validateSession(inputs: EmotionInput[]): ValidationResult {
  const errors: string[] = [];

  if (!inputs || inputs.length === 0) {
    errors.push('A session must contain at least one emotion');
    return { valid: false, errors };
  }

  inputs.forEach((input, i) => {
    const result = validateEmotionInput(input);
    result.errors.forEach(err => errors.push(`Emotion ${i + 1}: ${err}`));
  });

  return { valid: errors.length === 0, errors };
}

// ── SINGLE EMOTION SCORING ────────────────────────────────────────────────────

/**
 * Scores a single validated EmotionInput.
 * Callers must validate inputs before calling this.
 * Throws if the emotion/tier combination is not in the registry.
 */
export function scoreEmotion(input: EmotionInput): ScoredEmotion {
  const tierScore = getTierScore(input.coreEmotion, input.tier);
  const weightedScore = round2(tierScore * input.intensity);

  return {
    ...input,
    tierScore,
    weightedScore,
  };
}

// ── SESSION SCORING ──────────────────────────────────────────────────────────

/**
 * Maps a daily score to its human-readable label.
 *
 * Ranges (inclusive):
 *   +8.00 to +10.00  → Exceptional
 *   +5.00 to  +7.99  → Very Positive
 *   +2.00 to  +4.99  → Generally Positive
 *   -1.99 to  +1.99  → Neutral / Mixed
 *   -4.99 to  -2.00  → Generally Negative
 *   -7.99 to  -5.00  → Very Negative
 *  -10.00 to  -8.00  → Difficult Day
 */
export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 8.0)  return 'Exceptional';
  if (score >= 5.0)  return 'Very Positive';
  if (score >= 2.0)  return 'Generally Positive';
  if (score >= -1.99) return 'Neutral / Mixed';
  if (score >= -4.99) return 'Generally Negative';
  if (score >= -7.99) return 'Very Negative';
  return 'Difficult Day';
}

/**
 * Scores a complete session (one or more emotions logged in a single day).
 *
 * Validates all inputs first. Throws a descriptive error if any input
 * is invalid — callers should validate before calling if they want
 * graceful error handling.
 *
 * @param inputs - Array of EmotionInputs from the user session
 * @returns DailyScoreResult with all scored emotions and the final daily score
 */
export function scoreSession(inputs: EmotionInput[]): DailyScoreResult {
  const validation = validateSession(inputs);
  if (!validation.valid) {
    throw new Error(
      `Invalid session input:\n${validation.errors.join('\n')}`,
    );
  }

  const emotions = inputs.map(scoreEmotion);

  const totalIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0);
  const totalWeighted  = round2(emotions.reduce((sum, e) => sum + e.weightedScore, 0));

  // Core formula: (Σ weighted / Σ intensity) × 10
  const rawScore   = (totalWeighted / totalIntensity) * 10;
  const dailyScore = round2(rawScore);

  const scoreLabel    = getScoreLabel(dailyScore);
  const isDifficultDay = dailyScore <= -8.0;

  return {
    emotions,
    totalIntensity,
    totalWeighted,
    dailyScore,
    scoreLabel,
    isDifficultDay,
  };
}

// ── PATTERN DETECTION ────────────────────────────────────────────────────────

/**
 * Groups entry records by "YYYY-MM" month key.
 */
function groupByMonth(entries: EntryRecord[]): Map<string, EntryRecord[]> {
  const map = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const monthKey = entry.date.slice(0, 7); // "YYYY-MM"
    const existing = map.get(monthKey) ?? [];
    existing.push(entry);
    map.set(monthKey, existing);
  }
  return map;
}

/**
 * Computes the average of an array of numbers.
 * Returns 0 for an empty array.
 */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Checks whether a user qualifies for longitudinal pattern detection
 * and whether the current month has a historically difficult pattern.
 *
 * Qualification requires:
 *   - At least 12 calendar months since first entry
 *   - At least 120 total entries (average 10/month over 12 months)
 *
 * Pattern alert triggers when:
 *   - The current month's historical average is ≥1.5 points below
 *     the user's overall annual average score
 *
 * @param entries      - All of the user's entry records, any order
 * @param currentMonth - The month to check, as "YYYY-MM" (defaults to now)
 */
export function checkPattern(
  entries: EntryRecord[],
  currentMonth?: string,
): PatternCheckResult {
  // Default to current month
  const now = currentMonth ?? new Date().toISOString().slice(0, 7);

  // ── Qualification checks ────────────────────────────────────────────────

  if (entries.length < PATTERN_MIN_TOTAL) {
    return {
      qualifies: false,
      disqualifyReason: `Not enough entries: ${entries.length} of ${PATTERN_MIN_TOTAL} required`,
      hasPattern: false,
    };
  }

  const byMonth = groupByMonth(entries);
  const monthKeys = Array.from(byMonth.keys()).sort();

  if (monthKeys.length < PATTERN_MIN_MONTHS) {
    return {
      qualifies: false,
      disqualifyReason: `Not enough months: ${monthKeys.length} of ${PATTERN_MIN_MONTHS} required`,
      hasPattern: false,
    };
  }

  // Check span: first to last month must be at least 12 months apart
  const firstMonth = monthKeys[0];
  const lastMonth  = monthKeys[monthKeys.length - 1];

  const [firstYear, firstMo] = firstMonth.split('-').map(Number);
  const [lastYear,  lastMo]  = lastMonth.split('-').map(Number);
  const monthSpan = (lastYear - firstYear) * 12 + (lastMo - firstMo);

  if (monthSpan < PATTERN_MIN_MONTHS - 1) {
    return {
      qualifies: false,
      disqualifyReason: `Data spans only ${monthSpan + 1} month(s); ${PATTERN_MIN_MONTHS} required`,
      hasPattern: false,
    };
  }

  // ── Pattern analysis ────────────────────────────────────────────────────

  const currentMonthNum = now.slice(5, 7); // "MM" — e.g. "12" for December

  // Collect all historical entries for the same calendar month (excluding current year)
  const currentYear = now.slice(0, 4);
  const historicalEntries = entries.filter(e => {
    const entryYear  = e.date.slice(0, 4);
    const entryMonth = e.date.slice(5, 7);
    return entryMonth === currentMonthNum && entryYear !== currentYear;
  });

  if (historicalEntries.length === 0) {
    // No prior-year data for this month yet
    return {
      qualifies: true,
      hasPattern: false,
    };
  }

  const historicalMonthAvg = avg(historicalEntries.map(e => e.dailyScore));
  const annualAvg = avg(entries.map(e => e.dailyScore));

  const hasPattern = historicalMonthAvg <= annualAvg - PATTERN_ALERT_THRESHOLD;

  const [year, month] = now.split('-').map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  const alertMessage = hasPattern
    ? `Looking back at your entries, ${monthName} tends to be a harder month for you. ` +
      `It might be a good time to reach out to someone you trust, be a little gentler ` +
      `with yourself, and check in a little more often.`
    : undefined;

  return {
    qualifies: true,
    hasPattern,
    alertMessage,
    historicalMonthAvg,
    annualAvg,
  };
}

// ── TREND UTILITIES ──────────────────────────────────────────────────────────

/**
 * Returns true if the score trend is declining.
 * "Declining" = the average of the last `windowDays` scores is more than
 * `threshold` points below the average of the `windowDays` scores before that.
 *
 * Used by the Insight screen to choose between coping vs growth article framing.
 *
 * @param recentScores - Daily scores ordered oldest → newest
 * @param windowDays   - How many days to use for each half-window (default 7)
 * @param threshold    - Point difference to count as "declining" (default 2.0)
 */
export function isTrendDeclining(
  recentScores: number[],
  windowDays = 7,
  threshold = 2.0,
): boolean {
  if (recentScores.length < windowDays * 2) return false;

  const half = Math.floor(recentScores.length / 2);
  const older  = recentScores.slice(0, half);
  const newer  = recentScores.slice(half);

  return avg(newer) <= avg(older) - threshold;
}
