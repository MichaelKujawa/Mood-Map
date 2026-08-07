import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { spacing, fontSize, radius, ThemeMode, Theme } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import { store } from '../../data/store';
import type { PersistedEntry, MonthlyStats } from '../../data/storageTypes';
import DailyHistoryView from './DailyHistoryView';
import Svg, { Line, Circle, Polyline } from 'react-native-svg';

interface Props {
  onClose: () => void;
}

function scoreColor(score: number, colors: Theme): string {
  if (score >= 2)  return '#4CAF50';
  if (score >= -2) return colors.gold;
  return '#EF5350';
}

// ── Mini spark line for each month ────────────────────────────────────────────

function SparkLine({ scores }: { scores: Array<{ date: string; score: number }> }) {
  const { colors } = useTheme();

  if (scores.length < 2) return null;

  const W = 80;
  const H = 36;
  const pad = 4;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const minScore = -10;
  const maxScore = 10;
  const range    = maxScore - minScore;

  const px = (i: number) =>
    pad + (i / Math.max(scores.length - 1, 1)) * innerW;

  const py = (v: number) =>
    pad + (1 - (v - minScore) / range) * innerH;

  const points = scores
    .map((s, i) => `${px(i)},${py(s.score)}`)
    .join(' ');

  return (
    <Svg width={W} height={H}>
      {/* Zero line */}
      <Line
        x1={pad}
        y1={py(0)}
        x2={W - pad}
        y2={py(0)}
        stroke={colors.border}
        strokeWidth={1}
      />
      {/* Score line */}
      <Polyline
        points={points}
        fill="none"
        stroke={colors.purpleLight}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Data points */}
      {scores.map((s, i) => (
        <Circle
          key={i}
          cx={px(i)}
          cy={py(s.score)}
          r={2.5}
          fill={s.score >= 0 ? '#4CAF50' : '#EF5350'}
        />
      ))}
    </Svg>
  );
}

// ── Month accordion row ───────────────────────────────────────────────────────

interface MonthRowProps {
  stats:          MonthlyStats;
  entries:        PersistedEntry[];
  onSelectEntry:  (entry: PersistedEntry) => void;
}

function MonthRow({ stats, entries, onSelectEntry }: MonthRowProps) {
  const { colors } = useTheme();

  const monthStyles = useMemo(
    () => createMonthStyles(colors),
    [colors]
  );
  const [expanded, setExpanded] = useState(false);

  const date       = new Date(stats.yearMonth + '-01T12:00:00');
  const monthName  = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const avgColor   = scoreColor(stats.avgScore, colors);
  const trend      = stats.avgScore >= 0 ? '▲' : '▼';
  const trendColor = stats.avgScore >= 0 ? '#4CAF50' : '#EF5350';

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={monthStyles.container}>

      {/* Month header — tap to expand */}
      <TouchableOpacity
        style={monthStyles.header}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={monthStyles.headerLeft}>
          <Text style={monthStyles.monthName}>{monthName}</Text>
          <View style={monthStyles.headerStats}>
            <Text style={[monthStyles.avgScore, { color: avgColor }]}>
              Avg {stats.avgScore > 0 ? '+' : ''}{stats.avgScore.toFixed(1)}
            </Text>
            <Text style={[monthStyles.trend, { color: trendColor }]}>{trend}</Text>
            <Text style={monthStyles.entryCount}>{stats.entryCount} entries</Text>
            {stats.longestStreak > 1 && (
              <Text style={monthStyles.streak}>🔥 {stats.longestStreak} day streak</Text>
            )}
          </View>
        </View>
        <View style={monthStyles.headerRight}>
          <SparkLine scores={stats.dailyScores} />
          <Text style={monthStyles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded: stats + entry list */}
      {expanded && (
        <View style={monthStyles.body}>

          {/* Month stats */}
          <View style={monthStyles.statsRow}>
            <View style={monthStyles.statItem}>
              <Text style={[monthStyles.statValue, { color: '#4CAF50' }]}>
                +{stats.highScore.toFixed(1)}
              </Text>
              <Text style={monthStyles.statLabel}>Best day</Text>
            </View>
            <View style={monthStyles.statDivider} />
            <View style={monthStyles.statItem}>
              <Text style={[monthStyles.statValue, { color: '#EF5350' }]}>
                {stats.lowScore.toFixed(1)}
              </Text>
              <Text style={monthStyles.statLabel}>Hardest day</Text>
            </View>
            <View style={monthStyles.statDivider} />
            <View style={monthStyles.statItem}>
              <Text style={monthStyles.statValue}>{stats.avgIntensity.toFixed(1)}</Text>
              <Text style={monthStyles.statLabel}>Avg intensity</Text>
            </View>
            <View style={monthStyles.statDivider} />
            <View style={monthStyles.statItem}>
              <Text style={monthStyles.statValue}>{stats.topEmotion || '—'}</Text>
              <Text style={monthStyles.statLabel}>Top emotion</Text>
            </View>
          </View>

          {/* Entry list */}
          <Text style={monthStyles.entriesLabel}>Entries</Text>
          {sorted.map(entry => {
            const entryDate  = new Date(entry.date + 'T12:00:00');
            const entryColor = scoreColor(entry.dailyScore, colors);
            return (
              <TouchableOpacity
                key={entry.id}
                style={monthStyles.entryRow}
                onPress={() => onSelectEntry(entry)}
                activeOpacity={0.7}
              >
                <View style={monthStyles.entryLeft}>
                  <Text style={monthStyles.entryDate}>
                    {entryDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month:   'short',
                      day:     'numeric',
                    })}
                  </Text>
                  <Text style={monthStyles.entryEmotions}>
                    {entry.emotions.map(e => e.derivative).join(' · ')}
                  </Text>
                </View>
                <View style={monthStyles.entryRight}>
                  <Text style={[monthStyles.entryScore, { color: entryColor }]}>
                    {entry.dailyScore > 0 ? '+' : ''}{entry.dailyScore.toFixed(1)}
                  </Text>
                  <Text style={monthStyles.viewMore}>View →</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createMonthStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    padding:           spacing.md,
    gap:               spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap:  spacing.xs,
  },
  monthName: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  avgScore: {
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  trend: {
    fontSize: fontSize.xs,
  },
  entryCount: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  streak: {
    fontSize: fontSize.xs,
    color:    colors.gold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  chevron: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding:        spacing.md,
    gap:            spacing.md,
  },
  statsRow: {
    flexDirection:   'row',
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.md,
  },
  statItem: {
    flex:       1,
    alignItems: 'center',
    gap:        spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  statValue: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  statLabel: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
    textAlign:'center',
  },
  statDivider: {
    width:           1,
    backgroundColor: colors.border,
    marginVertical:  spacing.xs,
  },
  entriesLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.xs,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  entryLeft: {
    flex: 1,
    gap:  2,
  },
  entryDate: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },
  entryEmotions: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap:        2,
  },
  entryScore: {
    fontSize:   fontSize.md,
    fontWeight: '800',
  },
  viewMore: {
    color:    colors.purpleLight,
    fontSize: fontSize.xs,
  },
});

// ── Important Data Points ─────────────────────────────────────────────────────

function ImportantDataPoints({ entries }: { entries: PersistedEntry[] }) {
  const { colors } = useTheme();

  const dpStyles = useMemo(
    () => createDpStyles(colors),
    [colors]
  );
  if (entries.length === 0) return null;

  const scores      = entries.map(e => e.dailyScore);
  const allEmotions = entries.flatMap(e => e.emotions.map(em => em.coreEmotion));
  const counts      = new Map<string, number>();
  allEmotions.forEach(em => counts.set(em, (counts.get(em) ?? 0) + 1));
  const topEmotion  = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const avgIntensity = entries.flatMap(e => e.emotions.map(em => em.intensity))
    .reduce((a, b) => a + b, 0) / entries.flatMap(e => e.emotions).length;
  const highScore   = Math.max(...scores);
  const highMonthly = (() => {
    const byMonth = new Map<string, number[]>();
    entries.forEach(e => {
      const ym = e.date.slice(0, 7);
      byMonth.set(ym, [...(byMonth.get(ym) ?? []), e.dailyScore]);
    });
    const avgs = [...byMonth.values()].map(s => s.reduce((a,b)=>a+b,0)/s.length);
    return avgs.length > 0 ? Math.max(...avgs) : 0;
  })();

  const points = [
    { label: 'Most common emotion',     value: topEmotion },
    { label: 'Average intensity',        value: avgIntensity.toFixed(1) },
    { label: 'Total entries',            value: String(entries.length) },
    { label: 'Highest daily score',      value: `+${highScore.toFixed(1)}` },
    { label: 'Highest monthly average',  value: `+${highMonthly.toFixed(1)}` },
  ];

  return (
    <View style={dpStyles.container}>
      <Text style={dpStyles.title}>Important Data Points</Text>
      {points.map((p, i) => (
        <View key={i} style={dpStyles.row}>
          <Text style={dpStyles.label}>{p.label}</Text>
          <Text style={dpStyles.value}>{p.value}</Text>
        </View>
      ))}
    </View>
  );
}

const createDpStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  title: {
    color:        colors.white,
    fontSize:     fontSize.md,
    fontWeight:   '700',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: {
    color:    colors.textMuted,
    fontSize: fontSize.sm,
  },
  value: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
});

// ── Main History Screen ───────────────────────────────────────────────────────

export default function HistoryScreen({ onClose }: Props) {
      const { colors } = useTheme();

    const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [loading, setLoading]             = useState(true);
  const [allEntries, setAllEntries]       = useState<PersistedEntry[]>([]);
  const [monthStats, setMonthStats]       = useState<MonthlyStats[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PersistedEntry | null>(null);
  const [showCount, setShowCount]         = useState(6);

  const loadData = useCallback(async () => {
    setLoading(true);
    const entriesResult = await store.getAllEntries();
    if (!entriesResult.ok) { setLoading(false); return; }

    const entries = entriesResult.value;
    setAllEntries(entries);

    // Get unique months
    const months = [...new Set(entries.map(e => e.date.slice(0, 7)))].sort().reverse();
    const stats: MonthlyStats[] = [];
    for (const ym of months) {
      const r = await store.getMonthlyStats(ym);
      if (r.ok) stats.push(r.value);
    }
    setMonthStats(stats);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Show daily detail view
  if (selectedEntry) {
    return (
      <DailyHistoryView
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.purple}
            style={{ marginTop: spacing.xxl }}
          />
        ) : allEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Complete your first New Entry to start building your history.
            </Text>
          </View>
        ) : (
          <>
            {/* Important data points */}
            <ImportantDataPoints entries={allEntries} />

            {/* Month accordions */}
            <View style={styles.monthsSection}>
              <Text style={styles.sectionTitle}>Monthly History</Text>
              <View style={styles.monthsList}>
                {monthStats.slice(0, showCount).map(stats => (
                  <MonthRow
                    key={stats.yearMonth}
                    stats={stats}
                    entries={allEntries.filter(
                      e => e.date.startsWith(stats.yearMonth),
                    )}
                    onSelectEntry={setSelectedEntry}
                  />
                ))}
              </View>

              {/* Show more */}
              {monthStats.length > showCount && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowCount(c => c + 6)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showMoreText}>
                    Show more history ▼
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
    gap:           spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  closeButton: {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    backgroundColor: colors.card,
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  emptyState: {
    alignItems:  'center',
    marginTop:   spacing.xxl,
    gap:         spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    color:      colors.white,
    fontSize:   fontSize.lg,
    fontWeight: '700',
  },
  emptyText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    textAlign:  'center',
    lineHeight: 22,
  },
  monthsSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  monthsList: {
    gap: spacing.md,
  },
  showMoreButton: {
    alignItems:      'center',
    paddingVertical: spacing.md,
  },
  showMoreText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },
});