// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Storage Keys
//
// Every AsyncStorage key used by the app, defined exactly once.
// Never type a key string freehand anywhere else in the codebase.
//
// Key naming convention:
//   moodmap::<domain>::<identifier>
//
// Entry (session) keys use the date PLUS a unique session id, because a
// single day can now hold more than one logged entry (e.g. a morning
// check-in and an evening check-in):
//   moodmap::entry::2026-03-22::3fa85f64-5717-4562-b3fc-2c963f66afa6
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
   * Prefix for all entry session keys. Each session is stored individually
   * under moodmap::entry::<YYYY-MM-DD>::<sessionId> so we can list/filter
   * by date without loading every entry into memory, while still allowing
   * multiple sessions to exist for the same date.
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

/** Separator between the date portion and the session id portion of an entry key */
const SESSION_KEY_SEPARATOR = '::';

/** Build the storage key for a single entry session on a given date. */
export function entryKey(date: string, sessionId: string): string {
  return `${STORAGE_KEYS.ENTRY_PREFIX}${date}${SESSION_KEY_SEPARATOR}${sessionId}`;
}

/** Prefix shared by every session key belonging to a single date. */
export function entryDatePrefix(date: string): string {
  return `${STORAGE_KEYS.ENTRY_PREFIX}${date}${SESSION_KEY_SEPARATOR}`;
}

/** Extracts the "YYYY-MM-DD" date portion from a full entry session key. */
export function dateFromEntryKey(key: string): string {
  const withoutPrefix = key.slice(STORAGE_KEYS.ENTRY_PREFIX.length);
  return withoutPrefix.split(SESSION_KEY_SEPARATOR)[0];
}

/** Build the storage key for a specific month's cached stats */
export function monthlyStatsKey(yearMonth: string): string {
  return `${STORAGE_KEYS.MONTHLY_STATS_PREFIX}${yearMonth}`;
}