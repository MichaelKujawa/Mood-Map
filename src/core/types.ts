// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Core Types
// Pure data shapes. No React, no AsyncStorage, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

// ── EMOTION TAXONOMY ─────────────────────────────────────────────────────────

export type CoreEmotion =
  | 'Joy'
  | 'Trust'
  | 'Anticipation'
  | 'Surprise'
  | 'Fear'
  | 'Sadness'
  | 'Disgust'
  | 'Anger';

export type EmotionTier = 'mild' | 'core' | 'intense';

/**
 * A derivative emotion is one of the three intensity tiers of a core emotion.
 * Each core emotion has exactly one mild, one core, and one intense derivative.
 */
export interface DerivativeEmotion {
  readonly name: string;
  readonly coreEmotion: CoreEmotion;
  readonly tier: EmotionTier;
  /** Pre-computed score = baseScore × tierMultiplier. Always stored with correct sign. */
  readonly tierScore: number;
}

/**
 * A blend emotion sits between two adjacent core emotions on Plutchik's Wheel.
 * Its score is the average of the two parent base scores.
 */
export interface BlendEmotion {
  readonly name: string;
  readonly parentA: CoreEmotion;
  readonly parentB: CoreEmotion;
  readonly blendScore: number;
  readonly description: string;
}

// ── ENTRY INPUT ──────────────────────────────────────────────────────────────

/**
 * A single emotion as logged by the user during a session.
 * This is the raw input to the scoring engine.
 */
export interface EmotionInput {
  /** The core emotion selected on the wheel */
  readonly coreEmotion: CoreEmotion;
  /** The intensity tier chosen (mild / core / intense) */
  readonly tier: EmotionTier;
  /** The specific derivative name (e.g. "Ecstasy", "Serenity") */
  readonly derivative: string;
  /**
   * User's intensity rating. Must be an integer from 1 to 10 inclusive.
   * 1 = barely felt; 10 = all-consuming.
   */
  readonly intensity: number;
  /** 1–4 sentences describing what caused this emotion */
  readonly journalNote: string;
}

// ── SCORED OUTPUT ─────────────────────────────────────────────────────────────

/** A single emotion after scoring — input fields plus computed contributions */
export interface ScoredEmotion extends EmotionInput {
  /** Tier score pulled from the emotion registry (correct sign enforced) */
  readonly tierScore: number;
  /**
   * tierScore × intensity.
   * Always stored with the correct mathematical sign.
   * Positive emotions always produce positive weightedScore values.
   */
  readonly weightedScore: number;
}

/** Human-readable label for the day's mood score */
export type ScoreLabel =
  | 'Exceptional'
  | 'Very Positive'
  | 'Generally Positive'
  | 'Neutral / Mixed'
  | 'Generally Negative'
  | 'Very Negative'
  | 'Difficult Day';

/**
 * The complete result of scoring a single day's emotion log.
 * This is what gets persisted to AsyncStorage.
 */
export interface DailyScoreResult {
  /** All emotions with their computed scores */
  readonly emotions: ScoredEmotion[];
  /** Sum of all intensity values */
  readonly totalIntensity: number;
  /** Sum of all weightedScore values (signed) */
  readonly totalWeighted: number;
  /**
   * Final daily score on a -10 to +10 scale.
   * Formula: (totalWeighted / totalIntensity) × 10
   * Rounded to 2 decimal places.
   */
  readonly dailyScore: number;
  /** Human-readable label for the score */
  readonly scoreLabel: ScoreLabel;
  /**
   * True if the score falls in the 'Difficult Day' range (-8 to -10).
   * Used by the UI to surface a gentle self-care prompt.
   */
  readonly isDifficultDay: boolean;
}

// ── PATTERN DETECTION ────────────────────────────────────────────────────────

/** A minimal entry record needed for pattern detection (subset of full entry) */
export interface EntryRecord {
  readonly date: string;       // ISO date string "YYYY-MM-DD"
  readonly dailyScore: number;
}

/**
 * Result of checking whether a user qualifies for longitudinal pattern detection
 * and whether the current month has a historically difficult pattern.
 */
export interface PatternCheckResult {
  /** Whether the user has enough data to run pattern detection */
  readonly qualifies: boolean;
  /** Reason why they don't qualify yet (for internal use / debugging) */
  readonly disqualifyReason?: string;
  /** Whether a pattern alert should be shown this month */
  readonly hasPattern: boolean;
  /** The alert message to surface if hasPattern is true */
  readonly alertMessage?: string;
  /** The current month's historical average (if qualifies) */
  readonly historicalMonthAvg?: number;
  /** The user's overall annual average (if qualifies) */
  readonly annualAvg?: number;
}
