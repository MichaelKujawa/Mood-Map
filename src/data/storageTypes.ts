// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Storage Types
//
// Types used by the data layer. These extend the core scoring types
// to represent persisted data structures.
// ─────────────────────────────────────────────────────────────────────────────

import type { DailyScoreResult } from '../core/types';

// ── PERSISTED ENTRY ──────────────────────────────────────────────────────────

/**
 * A complete daily entry as stored in AsyncStorage.
 * Combines the scoring result with metadata.
 */
export interface PersistedEntry extends DailyScoreResult {
  /** Unique identifier (UUID v4) */
  readonly id: string;
  /** ISO date string "YYYY-MM-DD" — also used as the storage key suffix */
  readonly date: string;
  /** ISO timestamp of when the entry was created */
  readonly createdAt: string;
}

// ── MONTHLY STATS ────────────────────────────────────────────────────────────

/**
 * Cached aggregate statistics for a single calendar month.
 * Always re-derivable from raw entries — the cache is a performance optimisation.
 */
export interface MonthlyStats {
  /** "YYYY-MM" */
  readonly yearMonth: string;
  readonly entryCount: number;
  readonly avgScore: number;
  readonly highScore: number;
  readonly lowScore: number;
  /** Most frequently logged core emotion in this month */
  readonly topEmotion: string;
  readonly avgIntensity: number;
  /** Longest consecutive-day streak within this month */
  readonly longestStreak: number;
  /** All daily scores in date order, for graph rendering */
  readonly dailyScores: Array<{ date: string; score: number }>;
}

// ── ALL-TIME STATS ───────────────────────────────────────────────────────────

/**
 * Cached all-time aggregate statistics.
 * Re-derivable from all raw entries.
 */
export interface AllTimeStats {
  readonly totalEntries: number;
  readonly highestDailyScore: number;
  readonly lowestDailyScore: number;
  readonly avgDailyScore: number;
  readonly highestMonthlyAvg: number;
  readonly avgIntensity: number;
  /** Most frequently logged core emotion across all time */
  readonly topEmotion: string;
  /** Current active streak (consecutive days with an entry up to today) */
  readonly currentStreak: number;
  /** Longest ever streak */
  readonly longestAllTimeStreak: number;
  /** ISO date of first ever entry */
  readonly firstEntryDate: string | null;
}

// ── USER PREFERENCES ─────────────────────────────────────────────────────────

export interface UserPreferences {
  readonly notificationsEnabled: boolean;
  /** "HH:MM" 24-hour format, e.g. "20:00" */
  readonly dailyReminderTime: string;
  readonly theme: 'dark' | 'light';
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: false,
  dailyReminderTime: '20:00',
  theme: 'dark',
} as const;

// ── STORAGE INTERFACE ─────────────────────────────────────────────────────────

/**
 * The interface that the storage layer depends on.
 * In production this is backed by AsyncStorage.
 * In tests it is backed by an in-memory Map.
 *
 * This abstraction means the entire data layer is testable
 * without a React Native environment.
 */
export interface IStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

// ── RESULT TYPES ─────────────────────────────────────────────────────────────

/** Wraps a data layer result to make errors explicit without throwing */
export type StorageResult<T> =
  | { ok: true;  value: T }
  | { ok: false; error: string };

export function ok<T>(value: T): StorageResult<T> {
  return { ok: true, value };
}

export function err<T>(error: string): StorageResult<T> {
  return { ok: false, error };
}
