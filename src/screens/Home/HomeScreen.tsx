import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, SafeAreaView, ScrollView,
} from 'react-native';
import { spacing, fontSize, radius } from '../../theme';
import { store } from '../../data/store';
import type { PersistedEntry } from '../../data/storageTypes';
import Svg, { Line, Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

// ── Navigation cards ──────────────────────────────────────────────────────────

const NAV_CARDS = [
  { id: 'history',  label: 'History',   icon: '📖', description: 'Browse past entries & trends'   },
  { id: 'insight',  label: 'Insight',   icon: '💡', description: 'Articles & seasonal tips' },
  { id: 'newEntry', label: 'New Entry', icon: '＋',  description: 'Log your emotions for today'  },
  { id: 'settings', label: 'Settings',  icon: '⚙️', description: 'Preferences & data export'    },
] as const;

type NavId = typeof NAV_CARDS[number]['id'];

interface Props {
  onNavigate: (screen: NavId) => void;
}

// ── Graph ─────────────────────────────────────────────────────────────────────

interface GraphProps {
  entries: PersistedEntry[];
}

function MiniGraph({ entries }: GraphProps) {
  const {colors} = useTheme();
  const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const graphWidth  = width - spacing.lg * 2 - spacing.md * 2 - 32;
  const graphHeight = 160;
  const padX = 12;
  const padY = 16;
  const innerW = graphWidth - padX * 2;
  const innerH = graphHeight - padY * 2;

  if (entries.length === 0) {
    return (
      <View style={[styles.graphEmpty, { height: graphHeight }]}>
        <Text style={styles.graphEmptyIcon}>📈</Text>
        <Text style={styles.graphEmptyText}>
          Begin entering data to{'\n'}generate your graph
        </Text>
      </View>
    );
  }

  const scores   = entries.map(e => e.dailyScore);
  const minScore = -10;
  const maxScore = 10;
  const range    = maxScore - minScore;

  const px = (i: number) =>
    padX + (i / Math.max(scores.length - 1, 1)) * innerW;

  const py = (score: number) =>
    padY + (1 - (score - minScore) / range) * innerH;

  // Linear regression for trend line
  const n      = scores.length;
  const xs     = scores.map((_, i) => px(i));
  const ys     = scores.map(s => py(s));
  const meanX  = xs.reduce((a, b) => a + b, 0) / n;
  const meanY  = ys.reduce((a, b) => a + b, 0) / n;
  const slope  = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) /
                 xs.reduce((s, x) => s + (x - meanX) ** 2, 1);
  const intercept = meanY - slope * meanX;
  const ty1 = slope * px(0) + intercept;
  const ty2 = slope * px(n - 1) + intercept;

  // Build SVG path for the score line
  const pathD = scores
    .map((score, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(score)}`)
    .join(' ');

  return (
    <Svg width={graphWidth} height={graphHeight}>
      {/* Zero line */}
      <Line
        x1={padX}
        y1={py(0)}
        x2={graphWidth - padX}
        y2={py(0)}
        stroke={colors.border}
        strokeWidth={1}
      />

      {/* Trend line */}
      {n > 1 && (
        <Line
          x1={px(0)}
          y1={ty1}
          x2={px(n - 1)}
          y2={ty2}
          stroke={colors.gold}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}

      {/* Score line */}
      <Path
        d={pathD}
        stroke={colors.white}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {scores.map((score, i) => (
        <Circle
          key={i}
          cx={px(i)}
          cy={py(score)}
          r={5}
          fill={score >= 0 ? '#4CAF50' : '#EF5350'}
          stroke={colors.background}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}

// ── Home screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ onNavigate }: Props) {
  const {colors} = useTheme();
  const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [recentEntries, setRecentEntries] = useState<PersistedEntry[]>([]);
  const [todayScore, setTodayScore]       = useState<number | null>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function loadData() {
      const result = await store.getRecentEntries(14);
      if (result.ok) {
        const entries = [...result.value].reverse();
        setRecentEntries(entries);
        const today      = new Date().toISOString().slice(0, 10);
        const todayEntry = entries.find(e => e.date === today);
        if (todayEntry) setTodayScore(todayEntry.dailyScore);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>MoodMap</Text>
          {todayScore !== null && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>
                Today: {todayScore > 0 ? '+' : ''}{todayScore.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Graph card */}
        <View style={styles.graphCard}>

          {/* Graph area with axis labels side by side */}
          <View style={styles.graphRow}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>10</Text>
              <Text style={styles.axisLabel}>0</Text>
              <Text style={styles.axisLabel}>-10</Text>
            </View>

            {/* Graph */}
            {!loading && <MiniGraph entries={recentEntries} />}
          </View>

          {/* Footer: x-axis label + legend */}
          <View style={styles.graphFooter}>
            <Text style={styles.xAxisLabel}>Entry Date</Text>
            <View style={styles.trendLegend}>
              <View style={styles.trendSwatch} />
              <Text style={styles.legendText}>Trend line</Text>
            </View>
          </View>

        </View>

        {/* Navigation cards */}
        <View style={styles.navGrid}>
          {NAV_CARDS.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.navCard,
                card.id === 'newEntry' && styles.navCardAccent,
              ]}
              onPress={() => onNavigate(card.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.navIcon}>{card.icon}</Text>
              <Text style={styles.navLabel}>{card.label}</Text>
              <Text style={[
                styles.navDescription,
                card.id === 'newEntry' && styles.navDescriptionAccent,
              ]}>
                {card.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.lg,
  },
  appName: {
    color:         colors.purpleLight,
    fontSize:      fontSize.xl,
    fontWeight:    '800',
    letterSpacing: 1,
  },
  todayBadge: {
    backgroundColor:  colors.purple,
    borderRadius:     radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
  },
  todayBadgeText: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },

  // Graph card
  graphCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    marginBottom:    spacing.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  graphRow: {
    flexDirection: 'row',
    alignItems:    'stretch',
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginRight:     spacing.xs,
    width:           28,
  },
  axisLabel: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    textAlign: 'right',
  },
  graphFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginTop:      spacing.md,
    paddingHorizontal: spacing.xs,
  },
  xAxisLabel: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  trendLegend: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  trendSwatch: {
    width:           16,
    height:          3,
    backgroundColor: colors.gold,
    borderRadius:    radius.full,
  },
  legendText: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },

  // Graph internals
  zeroLine: {
    position:        'absolute',
    height:          1,
    backgroundColor: colors.border,
  },
  dataPoint: {
    position:     'absolute',
    width:        12,
    height:       12,
    borderRadius: radius.full,
    borderWidth:  2,
    borderColor:  colors.background,
  },

  // Empty graph state
  graphEmpty: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            spacing.sm,
  },
  graphEmptyIcon: {
    fontSize: 32,
  },
  graphEmptyText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    textAlign:  'center',
    lineHeight: 20,
  },

  // Navigation cards
  navGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md,
    marginTop:     spacing.sm,
  },
  navCard: {
    width:           CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    alignItems:      'center',
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  navCardAccent: {
    backgroundColor: colors.purple,
    borderColor:     colors.purpleLight,
  },
  navIcon: {
    fontSize:     32,
    marginBottom: spacing.xs,
  },
  navLabel: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  navDescription: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    textAlign:  'center',
    lineHeight: 18,
  },
  navDescriptionAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
});