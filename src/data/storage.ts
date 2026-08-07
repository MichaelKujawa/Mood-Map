// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Storage Layer
//
// All AsyncStorage operations for the app. Every function is async and
// returns a StorageResult<T> — errors are values, not exceptions.
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
import type {
  PersistedEntry,
  MonthlyStats,
  AllTimeStats,
  UserPreferences,
  IStorage,
  StorageResult,
} from './storageTypes';
import { DEFAULT_PREFERENCES, ok, err } from './storageTypes';
import { STORAGE_KEYS, entryKey, monthlyStatsKey } from './storageKeys';
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
   * Saves a new daily entry. One entry per date is enforced —
   * calling this twice on the same date overwrites the first entry.
   *
   * @param date        - ISO date string "YYYY-MM-DD"
   * @param scoreResult - The result from scoreSession()
   */
  async function saveEntry(
    date: string,
    scoreResult: DailyScoreResult,
  ): Promise<StorageResult<PersistedEntry>> {
    try {
      const entry: PersistedEntry = {
        ...scoreResult,
        id: uuidv4(),
        date,
        createdAt: new Date().toISOString(),
      };
      await storage.setItem(entryKey(date), JSON.stringify(entry));
      // Invalidate affected caches
      await invalidateMonthCache(date.slice(0, 7));
      await invalidateAllTimeCache();
      return ok(entry);
    } catch (e) {
      return err(`Failed to save entry for ${date}: ${String(e)}`);
    }
  }

  /**
   * Deletes an entry by date. Also invalidates the relevant caches.
   */
  async function deleteEntry(date: string): Promise<StorageResult<void>> {
    try {
      await storage.removeItem(entryKey(date));
      await invalidateMonthCache(date.slice(0, 7));
      await invalidateAllTimeCache();
      return ok(undefined);
    } catch (e) {
      return err(`Failed to delete entry for ${date}: ${String(e)}`);
    }
  }

  // ── ENTRIES — READ ─────────────────────────────────────────────────────────

  /**
   * Gets a single entry by date. Returns null if no entry exists for that date.
   */
  async function getEntry(date: string): Promise<StorageResult<PersistedEntry | null>> {
    try {
      const raw = await storage.getItem(entryKey(date));
      if (!raw) return ok(null);
      return ok(JSON.parse(raw) as PersistedEntry);
    } catch (e) {
      return err(`Failed to get entry for ${date}: ${String(e)}`);
    }
  }

  /**
   * Gets all entries, sorted newest → oldest.
   */
  async function getAllEntries(): Promise<StorageResult<PersistedEntry[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const entryKeys = allKeys
        .filter(k => k.startsWith(STORAGE_KEYS.ENTRY_PREFIX))
        .sort()
        .reverse(); // newest first

      if (entryKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(entryKeys);
      const entries = pairs
        .map(([, raw]) => raw ? JSON.parse(raw) as PersistedEntry : null)
        .filter((e): e is PersistedEntry => e !== null);

      return ok(entries);
    } catch (e) {
      return err(`Failed to get all entries: ${String(e)}`);
    }
  }

  /**
   * Gets all entries for a specific calendar month.
   * @param yearMonth - "YYYY-MM"
   */
  async function getEntriesForMonth(
    yearMonth: string,
  ): Promise<StorageResult<PersistedEntry[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const monthKeys = allKeys
        .filter(k => k.startsWith(`${STORAGE_KEYS.ENTRY_PREFIX}${yearMonth}`))
        .sort()
        .reverse();

      if (monthKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(monthKeys);
      const entries = pairs
        .map(([, raw]) => raw ? JSON.parse(raw) as PersistedEntry : null)
        .filter((e): e is PersistedEntry => e !== null);

      return ok(entries);
    } catch (e) {
      return err(`Failed to get entries for ${yearMonth}: ${String(e)}`);
    }
  }

  /**
   * Gets entries within a date range (inclusive).
   * @param from - "YYYY-MM-DD"
   * @param to   - "YYYY-MM-DD"
   */
  async function getEntriesInRange(
    from: string,
    to: string,
  ): Promise<StorageResult<PersistedEntry[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const rangeKeys = allKeys
        .filter(k => {
          if (!k.startsWith(STORAGE_KEYS.ENTRY_PREFIX)) return false;
          const date = k.slice(STORAGE_KEYS.ENTRY_PREFIX.length);
          return date >= from && date <= to;
        })
        .sort()
        .reverse();

      if (rangeKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(rangeKeys);
      const entries = pairs
        .map(([, raw]) => raw ? JSON.parse(raw) as PersistedEntry : null)
        .filter((e): e is PersistedEntry => e !== null);

      return ok(entries);
    } catch (e) {
      return err(`Failed to get entries in range ${from}–${to}: ${String(e)}`);
    }
  }

  /**
   * Gets the N most recent entries. Used for the home screen graph
   * and the trend window for Insight article surfacing.
   */
  async function getRecentEntries(
    count: number,
  ): Promise<StorageResult<PersistedEntry[]>> {
    try {
      const allKeys = await storage.getAllKeys();
      const entryKeys = allKeys
        .filter(k => k.startsWith(STORAGE_KEYS.ENTRY_PREFIX))
        .sort()
        .reverse()
        .slice(0, count);

      if (entryKeys.length === 0) return ok([]);

      const pairs = await storage.multiGet(entryKeys);
      const entries = pairs
        .map(([, raw]) => raw ? JSON.parse(raw) as PersistedEntry : null)
        .filter((e): e is PersistedEntry => e !== null);

      return ok(entries);
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

      // Cache miss — compute from entries
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
            .map(k => k.slice(STORAGE_KEYS.ENTRY_PREFIX.length, STORAGE_KEYS.ENTRY_PREFIX.length + 7))
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

      // Cache miss — compute from all entries
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
   * Exports all user data as a JSON string.
   * Used by the Settings screen export feature.
   */
  async function exportAllData(): Promise<StorageResult<string>> {
    try {
      const [entriesResult, prefsResult] = await Promise.all([
        getAllEntries(),
        getPreferences(),
      ]);
      if (!entriesResult.ok) return err(entriesResult.error);

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        preferences: prefsResult,
        entries: entriesResult.value,
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
    // Entries
    saveEntry,
    deleteEntry,
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
