// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Stats Engine
//
// Pure functions that compute MonthlyStats and AllTimeStats from
// DailyAggregate arrays (one row per calendar date, already averaged
// across any multiple sessions logged that day). No AsyncStorage access —
// these are called by the storage layer after reading entries, and can
// also be called directly in tests or for on-the-fly recalculation.
// ─────────────────────────────────────────────────────────────────────────────

import type { DailyAggregate, MonthlyStats, AllTimeStats } from './storageTypes';

// ── HELPERS ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Returns the most frequently occurring value in an array.
 * On a tie, returns whichever tied value appeared first.
 */
function mostFrequent(values: string[]): string {
  if (values.length === 0) return '';
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let top = values[0];
  let topCount = 0;
  for (const [val, count] of counts) {
    if (count > topCount) { top = val; topCount = count; }
  }
  return top;
}

/**
 * Given a sorted array of "YYYY-MM-DD" date strings,
 * returns the longest run of consecutive calendar days.
 */
function longestConsecutiveStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else if (diffDays > 1) {
      current = 1;
    }
    // diffDays === 0 means duplicate date — skip without resetting
  }
  return best;
}

/**
 * Returns the current active streak: consecutive days ending on
 * today (or yesterday, to forgive the user if they haven't logged yet today).
 */
function currentStreak(sortedDates: string[], today: string): number {
  if (sortedDates.length === 0) return 0;

  const todayMs  = new Date(today).getTime();
  const oneDayMs = 1000 * 60 * 60 * 24;

  // Work backwards from the most recent entry
  const unique = [...new Set(sortedDates)].sort();
  const last = unique[unique.length - 1];
  const lastMs = new Date(last).getTime();

  // If last entry is more than 1 day ago, streak is broken
  if (todayMs - lastMs > oneDayMs * 1.5) return 0;

  let streak = 1;
  for (let i = unique.length - 2; i >= 0; i--) {
    const curr = new Date(unique[i + 1]).getTime();
    const prev = new Date(unique[i]).getTime();
    const diff = Math.round((curr - prev) / oneDayMs);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── MONTHLY STATS ────────────────────────────────────────────────────────────

/**
 * Computes MonthlyStats for a given calendar month from an array of
 * DailyAggregates (one per date). Caller should pass only aggregates
 * belonging to that month.
 *
 * @param yearMonth - "YYYY-MM"
 * @param entries   - All day-aggregates for this month, any order
 */
export function computeMonthlyStats(
  yearMonth: string,
  entries: DailyAggregate[],
): MonthlyStats {
  if (entries.length === 0) {
    return {
      yearMonth,
      entryCount: 0,
      avgScore: 0,
      highScore: 0,
      lowScore: 0,
      topEmotion: '',
      avgIntensity: 0,
      longestStreak: 0,
      dailyScores: [],
    };
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const scores = sorted.map(e => e.dailyScore);
  const allCoreEmotions = entries.flatMap(e => e.emotions.map(em => em.coreEmotion));
  const allIntensities  = entries.flatMap(e => e.emotions.map(em => em.intensity));

  return {
    yearMonth,
    entryCount:    sorted.length,
    avgScore:      avg(scores),
    highScore:     Math.max(...scores),
    lowScore:      Math.min(...scores),
    topEmotion:    mostFrequent(allCoreEmotions),
    avgIntensity:  avg(allIntensities),
    longestStreak: longestConsecutiveStreak(sorted.map(e => e.date)),
    dailyScores:   sorted.map(e => ({ date: e.date, score: e.dailyScore })),
  };
}

// ── ALL-TIME STATS ────────────────────────────────────────────────────────────

/**
 * Computes AllTimeStats from the complete entry history.
 *
 * @param entries - All day-aggregates across all time, any order
 * @param today   - ISO date "YYYY-MM-DD" for streak calculation (defaults to now)
 */
export function computeAllTimeStats(
  entries: DailyAggregate[],
  today?: string,
): AllTimeStats {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);

  if (entries.length === 0) {
    return {
      totalEntries:        0,
      highestDailyScore:   0,
      lowestDailyScore:    0,
      avgDailyScore:       0,
      highestMonthlyAvg:   0,
      avgIntensity:        0,
      topEmotion:          '',
      currentStreak:       0,
      longestAllTimeStreak:0,
      firstEntryDate:      null,
    };
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const scores       = sorted.map(e => e.dailyScore);
  const allEmotions  = entries.flatMap(e => e.emotions.map(em => em.coreEmotion));
  const allIntensity = entries.flatMap(e => e.emotions.map(em => em.intensity));

  // Group by month to find highest monthly average
  const byMonth = new Map<string, number[]>();
  for (const entry of sorted) {
    const ym = entry.date.slice(0, 7);
    const existing = byMonth.get(ym) ?? [];
    existing.push(entry.dailyScore);
    byMonth.set(ym, existing);
  }
  const monthlyAvgs = Array.from(byMonth.values()).map(avg);

  const sortedDates = sorted.map(e => e.date);

  return {
    totalEntries:         sorted.length,
    highestDailyScore:    round2(Math.max(...scores)),
    lowestDailyScore:     round2(Math.min(...scores)),
    avgDailyScore:        avg(scores),
    highestMonthlyAvg:    round2(Math.max(...monthlyAvgs)),
    avgIntensity:         avg(allIntensity),
    topEmotion:           mostFrequent(allEmotions),
    currentStreak:        currentStreak(sortedDates, todayStr),
    longestAllTimeStreak: longestConsecutiveStreak(sortedDates),
    firstEntryDate:       sorted[0]?.date ?? null,
  };
}

/**
 * Returns a sorted list of all "YYYY-MM" months that appear in entries.
 * Used to decide which month caches need refreshing.
 */
export function getMonthsFromEntries(entries: DailyAggregate[]): string[] {
  const months = new Set(entries.map(e => e.date.slice(0, 7)));
  return Array.from(months).sort();
}