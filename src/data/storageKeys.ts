// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Storage Keys
//
// Every AsyncStorage key used by the app, defined exactly once.
// Never type a key string freehand anywhere else in the codebase.
//
// Key naming convention:
//   moodmap::<domain>::<identifier>
//
// Entry keys use the date as the identifier so they can be listed and
// sorted without reading their values:
//   moodmap::entry::2026-03-22
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  // ── App state ──────────────────────────────────────────────────────────────
  /** Whether the user has completed (or skipped) onboarding */
  HAS_COMPLETED_ONBOARDING: 'moodmap::app::hasCompletedOnboarding',

  // ── User preferences ───────────────────────────────────────────────────────
  /** Full UserPreferences object */
  USER_PREFERENCES: 'moodmap::prefs::userPreferences',

  // ── Entries ────────────────────────────────────────────────────────────────
  /**
   * Prefix for all entry keys. Each entry is stored individually under
   * moodmap::entry::<YYYY-MM-DD> so we can list/filter by date
   * without loading every entry into memory.
   */
  ENTRY_PREFIX: 'moodmap::entry::',

  // ── Cached stats (re-derivable from raw entries) ──────────────────────────
  /**
   * Prefix for per-month stat caches.
   * Key format: moodmap::stats::month::<YYYY-MM>
   */
  MONTHLY_STATS_PREFIX: 'moodmap::stats::month::',

  /** All-time aggregate stats */
  ALL_TIME_STATS: 'moodmap::stats::allTime',
} as const;

/** Build the storage key for a specific entry by its ISO date string */
export function entryKey(date: string): string {
  return `${STORAGE_KEYS.ENTRY_PREFIX}${date}`;
}

/** Build the storage key for a specific month's cached stats */
export function monthlyStatsKey(yearMonth: string): string {
  return `${STORAGE_KEYS.MONTHLY_STATS_PREFIX}${yearMonth}`;
}
