import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  type LayoutChangeEvent,
} from 'react-native';
import { store } from '../../data/store';
import type { DailyAggregate } from '../../data/storageTypes';
import Svg, { Line, Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ── Graph ─────────────────────────────────────────────────────────────────────

interface GraphProps {
  entries:     DailyAggregate[];
  graphWidth:  number;
  graphHeight: number;
}

function MiniGraph({ entries, graphWidth, graphHeight }: GraphProps) {
  const { colors } = useTheme();

  const padX = 12;
  const padY = 16;
  const innerW = Math.max(0, graphWidth - padX * 2);
  const innerH = Math.max(0, graphHeight - padY * 2);

  if (graphWidth <= 0 || graphHeight <= 0) return null;

  if (entries.length === 0) {
    return (
      <View style={[localStyles.graphEmpty, { width: graphWidth, height: graphHeight }]}>
        <Text style={localStyles.graphEmptyIcon}>📈</Text>
        <Text style={[localStyles.graphEmptyText, { color: colors.textMuted }]}>
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

  const pathD = scores
    .map((score, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(score)}`)
    .join(' ');

  return (
    <Svg width={graphWidth} height={graphHeight}>
      <Line x1={padX} y1={py(0)} x2={graphWidth - padX} y2={py(0)} stroke={colors.border} strokeWidth={1} />

      {n > 1 && (
        <Line x1={px(0)} y1={ty1} x2={px(n - 1)} y2={ty2} stroke={colors.gold} strokeWidth={2} strokeDasharray="4 3" />
      )}

      <Path d={pathD} stroke={colors.white} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

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

// A couple of graph-internal styles that don't depend on the theme's
// live-scaled spacing (kept local/static rather than threaded through
// createStyles since MiniGraph only needs colors here).
const localStyles = StyleSheet.create({
  graphEmpty: {
    justifyContent: 'center',
    alignItems:     'center',
    gap:            8,
  },
  graphEmptyIcon: {
    fontSize: 32,
  },
  graphEmptyText: {
    fontSize:   13,
    textAlign:  'center',
    lineHeight: 20,
  },
});

// ── Home screen ───────────────────────────────────────────────────────────────
//
// Layout model: the screen below the header is split exactly 50/50 between
// the graph and the nav grid — a row split in landscape (graph left, grid
// right), a column split in portrait (graph top, grid bottom). Both halves
// use flex:1 so they fill 100% of the available space in both directions;
// there's no phone/tablet branching here anymore, just orientation. The nav
// grid itself is always a fixed 2×2 layout that fills its half completely,
// each button taking exactly one quarter of that half's area.
//
// This intentionally does NOT use the MAX_CONTENT_WIDTH cap from
// responsive.ts — that cap exists to stop content going full-bleed on a
// big screen, which directly conflicts with "fill all available space"
// here. Worth deciding deliberately whether other screens should follow
// suit, rather than this one silently diverging.

export default function HomeScreen({ onNavigate }: Props) {
  const { colors, spacing, fontSize, radius, isLandscape } = useTheme();

  const styles = createStyles(colors, spacing, radius, fontSize);

  const [recentEntries, setRecentEntries] = useState<DailyAggregate[]>([]);
  const [todayScore, setTodayScore]       = useState<number | null>(null);

  // Measured live, same technique as itemHeight/wheelHeight in the wheel
  // screen — the graph row's actual rendered size is the real available
  // space, not a guessed fraction of the screen. Reset on orientation
  // flip so a stale measurement from the other layout can't briefly be
  // used to size the graph wrong for a frame.
  const [graphRowSize, setGraphRowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setGraphRowSize({ width: 0, height: 0 });
  }, [isLandscape]);

  function onGraphRowLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setGraphRowSize({ width, height });
  }

  // Graph label sizes now scale with the graph's own measured size instead
  // of the shared theme fontSize scale — same reasoning as the nav grid
  // below: these boxes are much bigger than the design was originally
  // tuned for, and the theme's dampened scale doesn't track that.
  const graphMinDim = Math.min(graphRowSize.width, graphRowSize.height);
  const graphLabelSize = Math.round(clamp(graphMinDim * 0.045, 10, 20));

  // yAxis width was a fixed 28dp, sized for the old fixed ~11pt label —
  // once labels scale up with graphLabelSize, "-10" (3 characters) no
  // longer fits and wraps onto two lines ("-1" / "0"). Widened
  // proportionally to the actual label size instead of a fixed constant.
  const yAxisWidth = Math.max(28, Math.round(graphLabelSize * 2.6)) + spacing.xs;
  const graphWidth  = Math.max(0, graphRowSize.width - yAxisWidth);
  const graphHeight = graphRowSize.height;

  // Line heights derived alongside each dynamic font size rather than
  // left at a fixed value or RN's default — a lineHeight that doesn't
  // track a font size ranging anywhere from ~11pt to ~32pt either clips
  // glyphs at the top (too tight) or cramps wrapped lines (also too
  // tight, just less obviously so until text actually wraps).
  const graphLabelLineHeight = Math.round(graphLabelSize * 1.3);

  // The nav grid's actual rendered size — measured the same way as the
  // graph row, since a fixed 2×2 grid filling half the screen is a very
  // different size than the wrap-grid this screen used to have, and the
  // shared theme fontSize scale (deliberately dampened for phone→tablet
  // reading screens) doesn't track boxes this large. Reset alongside
  // graphRowSize on orientation flip for the same reason.
  const [navHalfSize, setNavHalfSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setNavHalfSize({ width: 0, height: 0 });
  }, [isLandscape]);

  function onNavHalfLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setNavHalfSize({ width, height });
  }

  const quadrantWidth  = navHalfSize.width / 2;
  const quadrantHeight = navHalfSize.height / 2;
  const quadrantMinDim = Math.min(quadrantWidth, quadrantHeight);

  // Scaled off the smaller quadrant dimension so text never overflows a
  // narrow quadrant even if the other dimension is generous. Clamped so
  // it can't go illegibly small on a tiny phone quadrant or comically
  // large on a big tablet.
  const navIconSize        = Math.round(clamp(quadrantMinDim * 0.24,  28, 96));
  const navLabelSize       = Math.round(clamp(quadrantMinDim * 0.115, 14, 32));
  const navDescriptionSize = Math.round(clamp(quadrantMinDim * 0.075, 11, 20));

  // Same reasoning as graphLabelLineHeight above. The icon gets the
  // smallest multiplier since emoji glyphs need less headroom than Latin
  // text with ascenders/descenders; the description gets the most since
  // it's the one most likely to actually wrap to a second line.
  const navIconLineHeight        = Math.round(navIconSize * 1.15);
  const navLabelLineHeight       = Math.round(navLabelSize * 1.25);
  const navDescriptionLineHeight = Math.round(navDescriptionSize * 1.4);

  // Padding was dropped when the wrap-grid became a fixed 2×2 grid — with
  // no padding, text runs right up to the card border, especially
  // noticeable in landscape where quadrants are wider than they are tall.
  // Scaled the same way as the text sizes above rather than a fixed
  // spacing.lg, so it stays proportionate whether the quadrant is a small
  // phone-landscape box or a huge tablet one.
  const navCardPadding = Math.round(clamp(quadrantMinDim * 0.09, spacing.md, 40));

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
    }
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>

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

      {/* Body — 50/50 split, direction follows orientation */}
      <View style={[styles.body, { flexDirection: isLandscape ? 'row' : 'column' }]}>

        {/* Graph half */}
        <View style={styles.graphCard}>
          <View style={styles.graphRow} onLayout={onGraphRowLayout}>
            <View style={[styles.yAxis, { width: yAxisWidth - spacing.xs }]}>
              <Text style={[styles.axisLabel, { fontSize: graphLabelSize, lineHeight: graphLabelLineHeight }]} numberOfLines={1}>10</Text>
              <Text style={[styles.axisLabel, { fontSize: graphLabelSize, lineHeight: graphLabelLineHeight }]} numberOfLines={1}>0</Text>
              <Text style={[styles.axisLabel, { fontSize: graphLabelSize, lineHeight: graphLabelLineHeight }]} numberOfLines={1}>-10</Text>
            </View>

            <MiniGraph entries={recentEntries} graphWidth={graphWidth} graphHeight={graphHeight} />
          </View>

          <View style={styles.graphFooter}>
            <Text style={[styles.xAxisLabel, { fontSize: graphLabelSize, lineHeight: graphLabelLineHeight }]}>Entry Date</Text>
            <View style={styles.trendLegend}>
              <View style={styles.trendSwatch} />
              <Text style={[styles.legendText, { fontSize: graphLabelSize, lineHeight: graphLabelLineHeight }]}>Trend line</Text>
            </View>
          </View>
        </View>

        {/* Nav half — fixed 2×2 grid filling its half completely */}
        <View style={styles.navHalf} onLayout={onNavHalfLayout}>
          {NAV_CARDS.map(card => (
            <View key={card.id} style={styles.navQuadrant}>
              <TouchableOpacity
                style={[
                  styles.navCard,
                  { padding: navCardPadding },
                  card.id === 'newEntry' && styles.navCardAccent,
                ]}
                onPress={() => onNavigate(card.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.navIcon, { fontSize: navIconSize, lineHeight: navIconLineHeight }]}>{card.icon}</Text>
                <Text style={[styles.navLabel, { fontSize: navLabelSize, lineHeight: navLabelLineHeight }]}>{card.label}</Text>
                <Text style={[
                  styles.navDescription,
                  { fontSize: navDescriptionSize, lineHeight: navDescriptionLineHeight },
                  card.id === 'newEntry' && styles.navDescriptionAccent,
                ]}>
                  {card.description}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (colors: any, spacing: any, radius: any, fontSize?: any) =>
  StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.md,
  },
  appName: {
    color:         colors.purpleLight,
    fontSize:      fontSize?.xl ?? 26,
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
    fontSize:   fontSize?.sm ?? 13,
    fontWeight: '700',
  },

  // 50/50 split — flexDirection set inline based on isLandscape
  body: {
    flex: 1,
    gap:  spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom:     spacing.lg,
  },

  graphCard: {
    flex:            1,
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  graphRow: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'stretch',
  },
  yAxis: {
    // width applied inline via yAxisWidth (label-size-driven)
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginRight:     spacing.xs,
  },
  axisLabel: {
    // fontSize applied inline via graphLabelSize (measurement-driven)
    color:     colors.textMuted,
    textAlign: 'right',
  },
  graphFooter: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingTop:        spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  xAxisLabel: {
    // fontSize applied inline via graphLabelSize (measurement-driven)
    color: colors.textMuted,
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
    // fontSize applied inline via graphLabelSize (measurement-driven)
    color: colors.textMuted,
  },

  // Nav half — a fixed 2×2 grid. Each quadrant is exactly 50% x 50% of
  // the nav half; padding on the quadrant (rather than `gap` on the row)
  // creates the visual gutter between cards without any risk of a wrap
  // row overflowing past 100% width.
  navHalf: {
    flex:          1,
    flexDirection: 'row',
    flexWrap:      'wrap',
  },
  navQuadrant: {
    width:   '50%',
    height:  '50%',
    padding: spacing.sm / 2,
  },
  navCard: {
    flex:            1,
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  navCardAccent: {
    backgroundColor: colors.purple,
    borderColor:     colors.purpleLight,
  },
  navIcon: {
    // fontSize applied inline via navIconSize (quadrant-measurement-driven)
    marginBottom: spacing.xs,
  },
  navLabel: {
    // fontSize applied inline via navLabelSize (quadrant-measurement-driven)
    color:      colors.white,
    fontWeight: '700',
  },
  navDescription: {
    // fontSize/lineHeight applied inline via navDescriptionSize/navDescriptionLineHeight
    color:     colors.textMuted,
    textAlign: 'center',
  },
  navDescriptionAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
});