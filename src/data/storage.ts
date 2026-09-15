// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Storage Layer
//
// All AsyncStorage operations for the app. Every function is async and
// returns a StorageResult<T> — errors are values, not exceptions.
//
// A single date can now hold multiple logged *sessions* (e.g. a morning
// and an evening check-in). Each session is stored under its own key.
// Anything reading "the entry for a date" gets back a DailyAggregate —
// the combination of every session logged that day, with dailyScore equal
// to the plain average of each session's own dailyScore.
//
// This module depends on IStorage (not AsyncStorage directly), so it is
// fully testable with an in-memory mock. To use in a React Native app:
//
//   import AsyncStorage from '@react-native-async-storage/async-storage';
//   import { createStore } from './storage';
//   const store = createStore(AsyncStorage);
//
// ─────────────────────────────────────────────────────────────────────────────

import type { DailyScoreResult } from '../core/types';
import { getScoreLabel } from '../core/scoringEngine';
import type {
  PersistedEntry,
  DailyAggregate,
  MonthlyStats,
  AllTimeStats,
  UserPreferences,
  IStorage,
  StorageResult,
} from './storageTypes';
import { DEFAULT_PREFERENCES, ok, err } from './storageTypes';
import {
  STORAGE_KEYS,
  entryKey,
  entryDatePrefix,
  dateFromEntryKey,
  monthlyStatsKey,
} from './storageKeys';
import { computeMonthlyStats, computeAllTimeStats, getMonthsFromEntries } from './statsEngine';

// ── UUID ─────────────────────────────────────────────────────────────────────
// Minimal UUID v4 that works in both React Native and Node without crypto.
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── AGGREGATION ────────────────────────────────────────────────────────────
// Combines every session logged on a date into a single DailyAggregate.

/**
 * Combines a date's sessions into one DailyAggregate.
 *
 * - emotions / totalIntensity / totalWeighted are combined across every
 *   session logged that day (concatenated / summed).
 * - dailyScore is the plain average of each session's own dailyScore —
 *   each check-in counts equally, regardless of how many emotions it held.
 */
function aggregateDay(date: string, sessions: PersistedEntry[]): DailyAggregate {
  const sorted = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const emotions       = sorted.flatMap(s => s.emotions);
  const totalIntensity = sorted.reduce((sum, s) => sum + s.totalIntensity, 0);
  const totalWeighted  = round2(sorted.reduce((sum, s) => sum + s.totalWeighted, 0));
  const dailyScore     = round2(
    sorted.reduce((sum, s) => sum + s.dailyScore, 0) / sorted.length,
  );
  const scoreLabel     = getScoreLabel(dailyScore);
  const isDifficultDay = dailyScore <= -8.0;

  return {
    date,
    emotions,
    totalIntensity,
    totalWeighted,
    dailyScore,
    scoreLabel,
    isDifficultDay,
    sessionCount:    sorted.length,
    sessions:        sorted,
    latestCreatedAt: sorted[0]?.createdAt ?? '',
  };
}

/** Groups a flat list of sessions by date and turns each group into a DailyAggregate. */
function toAggregatesByDate(sessions: PersistedEntry[]): DailyAggregate[] {
  const byDate = new Map<string, PersistedEntry[]>();
  for (const s of sessions) {
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }
  return Array.from(byDate.entries())
    .map(([date, daySessions]) => aggregateDay(date, daySessions))
    .sort((a, b) => b.date.localeCompare(a.date)); // newest date first
}

function parseSessions(
  pairs: readonly (readonly [string, string | null])[],
): PersistedEntry[] {
  return pairs
    .map(([, raw]) => (raw ? (JSON.parse(raw) as PersistedEntry) : null))
    .filter((e): e is PersistedEntry => e !== null);
}

// ── STORE FACTORY ─────────────────────────────────────────────────────────────

/**
 * Creates a MoodMap store backed by the provided IStorage implementation.
 *
 * Usage in React Native:
 *   const store = createStore(AsyncStorage);
 *
 * Usage in tests:
 *   const store = createStore(new MemoryStorage());
 */
export function createStore(storage: IStorage) {

  // ── ONBOARDING ─────────────────────────────────────────────────────────────

  async function hasCompletedOnboarding(): Promise<boolean> {
    try {
      const raw = await storage.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING);
      return raw === 'true';
    } catch {
      return false;
    }
  }

  async function setOnboardingComplete(): Promise<StorageResult<void>> {
    try {
      await storage.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, 'true');
      return ok(undefined);
    } catch (e) {
      return err(`Failed to set onboarding complete: ${String(e)}`);
    }
  }

  // ── USER PREFERENCES ───────────────────────────────────────────────────────

  async function getPreferences(): Promise<UserPreferences> {
    try {
      const raw = await storage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) as Partial<UserPreferences> };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  async function savePreferences(
    prefs: Partial<UserPreferences>,
  ): Promise<StorageResult<UserPreferences>> {
    try {
      const current = await getPreferences();
      const updated: UserPreferences = { ...current, ...prefs };
      await storage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
      return ok(updated);
    } catch (e) {
      return err(`Failed to save preferences: ${String(e)}`);
    }
  }

  // ── ENTRIES — WRITE ────────────────────────────────────────────────────────

  /**
   * Adds a new entry *session* for the given date. This no longer overwrites
   * anything already logged that day — each call adds one more session, and
   * the date's displayed score becomes the average of every session logged
   * so far that day.
   *
   * @param date        - ISO date string "YYYY-MM-DD"
   * @param scoreResult - The result from scoreSession()
   */
  async function addEntry(
    date: string,
    scoreResult: DailyScoreResult,
  ): Promise<StorageResult<PersistedEntry>> {
    try {
      const session: PersistedEntry = {
        ...scoreResult,
        id:        uuidv4(),
        date,
        createdAt: new Date().toISOString(),
      };
      await storage.setItem(entryKey(date, session.id), JSON.stringify(session));
      // Invalidate affected caches
      await invalidateMonthCache(date.slice(0, 7));
      await invalidateAllTimeCache();
      return ok(session);
    } catch (e) {
      return err(`Failed to add entry for ${date}: ${String(e)}`);
    }
  }

  /**
   * @deprecated kept for backward compatibility with existing call sites —
   * behaves exactly like addEntry(): it appends a session, it does not
   * overwrite the date.
   */
  const saveEntry = addEntry;

  /**
   * Deletes a single session from a date, leaving any other sessions
   * logged that day intact.
   */
  async function deleteSession(
    date: string,
    sessionId: string,
  ): Promise<StorageResult<void>> {
    try {
      await storage.removeItem(entryKey(date, sessionId));
      await invalidateMonthCache(date.slice(0, 7));
      await invalidateAllTimeCache();
      return ok(undefined);
    } catch (e) {
      return err(`Failed to delete session ${sessionId} on ${date}: ${String(e)}`);
    }
  }

  /**
   * Deletes every session logged on a date (i.e. clears the whole day).
   * Also invalidates the relevant caches.
   */
  async function deleteEntry(date: string): Promise<StorageResult<void>> {
    try {
      const sessionsResult = await getSessionsForDate(date);
      if (!sessionsResult.ok) return err(sessionsResult.error);

      const keys = sessionsResult.value.map(s => entryKey(date, s.id));
      if (keys.length > 0) await storage.multiRemove(keys);

      await invalidateMonthCache(date.slice(0, 7));
      await invalidateAllTimeCache();
      return ok(undefined);
    } catch (e) {
      return err(`Failed to delete entries for ${date}: ${String(e)}`);
    }
  }

  // ── ENTRIES — READ ─────────────────────────────────────────────────────────

  /**
   * Gets the raw, un-aggregated sessions logged on a date, newest first.
   * Use this when you need to show individual check-ins (e.g. a per-session
   * breakdown), rather than the combined daily view.
   */
  async function getSessionsForDate(date: string): Promise<StorageResult<PersistedEntry[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const prefix  = entryDatePrefix(date);
      const keys    = allKeys.filter(k => k.startsWith(prefix));
      if (keys.length === 0) return ok([]);

      const pairs = await storage.multiGet(keys);
      const sessions = parseSessions(pairs)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(sessions);
    } catch (e) {
      return err(`Failed to get sessions for ${date}: ${String(e)}`);
    }
  }

  /**
   * Gets the combined view of a single date, or null if nothing has been
   * logged that day. dailyScore here is the average across every session
   * logged that day.
   */
  async function getEntry(date: string): Promise<StorageResult<DailyAggregate | null>> {
    try {
      const sessionsResult = await getSessionsForDate(date);
      if (!sessionsResult.ok) return err(sessionsResult.error);
      if (sessionsResult.value.length === 0) return ok(null);
      return ok(aggregateDay(date, sessionsResult.value));
    } catch (e) {
      return err(`Failed to get entry for ${date}: ${String(e)}`);
    }
  }

  /**
   * Gets one DailyAggregate per date that has data, sorted newest → oldest.
   */
  async function getAllEntries(): Promise<StorageResult<DailyAggregate[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const sessionKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.ENTRY_PREFIX));
      if (sessionKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(sessionKeys);
      const sessions = parseSessions(pairs);
      return ok(toAggregatesByDate(sessions));
    } catch (e) {
      return err(`Failed to get all entries: ${String(e)}`);
    }
  }

  /**
   * Gets one DailyAggregate per date in a specific calendar month.
   * @param yearMonth - "YYYY-MM"
   */
  async function getEntriesForMonth(
    yearMonth: string,
  ): Promise<StorageResult<DailyAggregate[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const monthKeys = allKeys.filter(
        k => k.startsWith(`${STORAGE_KEYS.ENTRY_PREFIX}${yearMonth}`),
      );
      if (monthKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(monthKeys);
      const sessions = parseSessions(pairs);
      return ok(toAggregatesByDate(sessions));
    } catch (e) {
      return err(`Failed to get entries for ${yearMonth}: ${String(e)}`);
    }
  }

  /**
   * Gets one DailyAggregate per date within a range (inclusive).
   * @param from - "YYYY-MM-DD"
   * @param to   - "YYYY-MM-DD"
   */
  async function getEntriesInRange(
    from: string,
    to: string,
  ): Promise<StorageResult<DailyAggregate[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const rangeKeys = allKeys.filter(k => {
        if (!k.startsWith(STORAGE_KEYS.ENTRY_PREFIX)) return false;
        const date = dateFromEntryKey(k);
        return date >= from && date <= to;
      });
      if (rangeKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(rangeKeys);
      const sessions = parseSessions(pairs);
      return ok(toAggregatesByDate(sessions));
    } catch (e) {
      return err(`Failed to get entries in range ${from}–${to}: ${String(e)}`);
    }
  }

  /**
   * Gets the N most recently logged DAYS (each may bundle multiple sessions).
   * Used for the home screen graph and the trend window for Insight
   * article surfacing.
   */
  async function getRecentEntries(
    count: number,
  ): Promise<StorageResult<DailyAggregate[]>> {
    try {
      const allResult = await getAllEntries();
      if (!allResult.ok) return err(allResult.error);
      return ok(allResult.value.slice(0, count));
    } catch (e) {
      return err(`Failed to get recent ${count} entries: ${String(e)}`);
    }
  }

  // ── STATS — MONTHLY ────────────────────────────────────────────────────────

  /**
   * Gets cached monthly stats, computing and caching them if the cache is stale.
   * @param yearMonth - "YYYY-MM"
   */
  async function getMonthlyStats(
    yearMonth: string,
  ): Promise<StorageResult<MonthlyStats>> {
    try {
      // Check cache first
      const cacheKey = monthlyStatsKey(yearMonth);
      const cached = await storage.getItem(cacheKey);
      if (cached) return ok(JSON.parse(cached) as MonthlyStats);

      // Cache miss — compute from entries (one aggregate per day)
      const entriesResult = await getEntriesForMonth(yearMonth);
      if (!entriesResult.ok) return err(entriesResult.error);

      const stats = computeMonthlyStats(yearMonth, entriesResult.value);
      await storage.setItem(cacheKey, JSON.stringify(stats));
      return ok(stats);
    } catch (e) {
      return err(`Failed to get monthly stats for ${yearMonth}: ${String(e)}`);
    }
  }

  /**
   * Gets monthly stats for a range of months. Used by History screen.
   * Returns months in descending order (newest first).
   */
  async function getMonthlyStatsRange(
    fromYearMonth: string,
    toYearMonth: string,
  ): Promise<StorageResult<MonthlyStats[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const entryMonths = [
        ...new Set(
          allKeys
            .filter(k => k.startsWith(STORAGE_KEYS.ENTRY_PREFIX))
            .map(k => dateFromEntryKey(k).slice(0, 7))
            .filter(ym => ym >= fromYearMonth && ym <= toYearMonth),
        ),
      ].sort().reverse();

      const results: MonthlyStats[] = [];
      for (const ym of entryMonths) {
        const result = await getMonthlyStats(ym);
        if (result.ok) results.push(result.value);
      }
      return ok(results);
    } catch (e) {
      return err(`Failed to get monthly stats range: ${String(e)}`);
    }
  }

  // ── STATS — ALL TIME ───────────────────────────────────────────────────────

  /**
   * Gets cached all-time stats, computing and caching them if stale.
   */
  async function getAllTimeStats(today?: string): Promise<StorageResult<AllTimeStats>> {
    try {
      const cached = await storage.getItem(STORAGE_KEYS.ALL_TIME_STATS);
      if (cached) return ok(JSON.parse(cached) as AllTimeStats);

      // Cache miss — compute from all entries (one aggregate per day)
      const allResult = await getAllEntries();
      if (!allResult.ok) return err(allResult.error);

      const stats = computeAllTimeStats(allResult.value, today);
      await storage.setItem(STORAGE_KEYS.ALL_TIME_STATS, JSON.stringify(stats));
      return ok(stats);
    } catch (e) {
      return err(`Failed to get all-time stats: ${String(e)}`);
    }
  }

  // ── CACHE INVALIDATION ─────────────────────────────────────────────────────

  async function invalidateMonthCache(yearMonth: string): Promise<void> {
    try {
      await storage.removeItem(monthlyStatsKey(yearMonth));
    } catch { /* Cache invalidation failure is non-fatal */ }
  }

  async function invalidateAllTimeCache(): Promise<void> {
    try {
      await storage.removeItem(STORAGE_KEYS.ALL_TIME_STATS);
    } catch { /* Cache invalidation failure is non-fatal */ }
  }

  /**
   * Rebuilds all stat caches from raw entries.
   * Call this after bulk operations or if caches are suspected corrupt.
   */
  async function rebuildAllCaches(): Promise<StorageResult<void>> {
    try {
      const allResult = await getAllEntries();
      if (!allResult.ok) return err(allResult.error);

      const entries = allResult.value;
      const months  = getMonthsFromEntries(entries);

      // Rebuild monthly caches
      for (const ym of months) {
        const monthEntries = entries.filter(e => e.date.startsWith(ym));
        const stats = computeMonthlyStats(ym, monthEntries);
        await storage.setItem(monthlyStatsKey(ym), JSON.stringify(stats));
      }

      // Rebuild all-time cache
      const allTimeStats = computeAllTimeStats(entries);
      await storage.setItem(STORAGE_KEYS.ALL_TIME_STATS, JSON.stringify(allTimeStats));

      return ok(undefined);
    } catch (e) {
      return err(`Failed to rebuild caches: ${String(e)}`);
    }
  }

  // ── DATA EXPORT ────────────────────────────────────────────────────────────

  /**
   * Exports all user data as a JSON string. Exports the raw, per-session
   * entries (a date may appear more than once if multiple sessions were
   * logged that day) so nothing is lost on export.
   * Used by the Settings screen export feature.
   */
  async function exportAllData(): Promise<StorageResult<string>> {
    try {
      const allKeys = await storage.getAllKeys();
      const sessionKeys = allKeys
        .filter(k => k.startsWith(STORAGE_KEYS.ENTRY_PREFIX))
        .sort();
      const pairs = await storage.multiGet(sessionKeys);
      const sessions = parseSessions(pairs);
      const prefs = await getPreferences();

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        preferences: prefs,
        // Raw per-session entries — a date may appear more than once.
        entries: sessions,
      };
      return ok(JSON.stringify(exportData, null, 2));
    } catch (e) {
      return err(`Failed to export data: ${String(e)}`);
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  return {
    // Onboarding
    hasCompletedOnboarding,
    setOnboardingComplete,
    // Preferences
    getPreferences,
    savePreferences,
    // Entries — write
    addEntry,
    saveEntry,       // alias of addEntry, kept for existing call sites
    deleteSession,
    deleteEntry,
    // Entries — read
    getSessionsForDate,
    getEntry,
    getAllEntries,
    getEntriesForMonth,
    getEntriesInRange,
    getRecentEntries,
    // Stats
    getMonthlyStats,
    getMonthlyStatsRange,
    getAllTimeStats,
    // Maintenance
    rebuildAllCaches,
    // Export
    exportAllData,
  };
}

export type MoodMapStore = ReturnType<typeof createStore>;