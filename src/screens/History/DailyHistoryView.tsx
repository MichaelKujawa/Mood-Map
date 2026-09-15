import React, {useMemo} from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext'; 
import { EMOTION_COLORS } from '../EmotionWheel/WheelItem';
import type { DailyAggregate } from '../../data/storageTypes';

interface Props {
  entry:   DailyAggregate;
  onClose: () => void;
}

function scoreColor(score: number, colors: any): string {
  if (score >= 2)  return '#4CAF50';
  if (score >= -2) return colors.gold;
  return '#EF5350';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
  });
}

export default function DailyHistoryView({ entry, onClose }: Props) {
  const { colors, spacing, fontSize, radius } = useTheme();

  const styles = useMemo(
    () => createStyles(colors, spacing, fontSize, radius),
    [colors, spacing, fontSize, radius]
  );

  const labelColor = scoreColor(entry.dailyScore, colors);
  const date = new Date(entry.date + 'T12:00:00');
  const hasMultipleSessions = entry.sessionCount > 1;

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
          <View style={styles.headerText}>
            <Text style={styles.headerDate}>
              {date.toLocaleDateString('en-US', {
                weekday: 'long',
                month:   'long',
                day:     'numeric',
                year:    'numeric',
              })}
            </Text>
            {hasMultipleSessions && (
              <Text style={styles.headerSub}>
                {entry.sessionCount} entries logged this day
              </Text>
            )}
          </View>
        </View>

        {/* Score card */}
        <View style={[styles.scoreCard, { borderColor: labelColor }]}>
          <Text style={styles.scoreLabel}>
            {hasMultipleSessions ? 'Average Daily Score' : 'Daily Score'}
          </Text>
          <Text style={[styles.scoreNumber, { color: labelColor }]}>
            {entry.dailyScore > 0 ? '+' : ''}{entry.dailyScore.toFixed(2)}
          </Text>
          <View style={[styles.scoreBadge, { backgroundColor: labelColor }]}>
            <Text style={styles.scoreBadgeText}>{entry.scoreLabel}</Text>
          </View>
          {hasMultipleSessions && (
            <Text style={styles.scoreCardHint}>
              Averaged across {entry.sessionCount} entries logged today
            </Text>
          )}
        </View>

        {/* Per-session breakdown — only shown when there's more than one entry */}
        {hasMultipleSessions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entries This Day</Text>
            <View style={styles.sessionsTable}>
              {entry.sessions.map((session, i) => {
                const sColor = scoreColor(session.dailyScore, colors);
                return (
                  <View
                    key={session.id}
                    style={[styles.sessionRow, i % 2 === 0 && styles.sessionRowAlt]}
                  >
                    <Text style={styles.sessionTime}>{formatTime(session.createdAt)}</Text>
                    <Text
                      style={styles.sessionEmotions}
                      numberOfLines={1}
                    >
                      {session.emotions.map(e => e.derivative).join(' · ')}
                    </Text>
                    <Text style={[styles.sessionScore, { color: sColor }]}>
                      {session.dailyScore > 0 ? '+' : ''}{session.dailyScore.toFixed(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Emotions felt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emotions Felt</Text>
          <View style={styles.emotionsTable}>

            {/* Table header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellEmotion, styles.tableHeaderText]}>
                Emotion
              </Text>
              <Text style={[styles.tableCell, styles.tableCellIntensity, styles.tableHeaderText]}>
                Intensity
              </Text>
              <Text style={[styles.tableCell, styles.tableCellScore, styles.tableHeaderText]}>
                Score
              </Text>
            </View>

            {/* Emotion rows */}
            {entry.emotions.map((emotion, i) => {
              const emotionColor  = EMOTION_COLORS[emotion.coreEmotion];
              const isPositive    = emotion.weightedScore >= 0;
              return (
                <View
                  key={i}
                  style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
                >
                  <View style={[styles.tableCell, styles.tableCellEmotion, styles.emotionCell]}>
                    <View style={[styles.emotionDot, { backgroundColor: emotionColor }]} />
                    <View>
                      <Text style={styles.emotionName}>{emotion.derivative}</Text>
                      <Text style={styles.emotionTier}>{emotion.tier} · {emotion.coreEmotion}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellIntensity, styles.intensityText]}>
                    {emotion.intensity}/10
                  </Text>
                  <Text style={[
                    styles.tableCell,
                    styles.tableCellScore,
                    styles.scoreText,
                    { color: isPositive ? '#4CAF50' : '#EF5350' },
                  ]}>
                    {isPositive ? '+' : ''}{emotion.weightedScore.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{entry.emotions.length}</Text>
            <Text style={styles.totalLabel}>emotions</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{entry.totalIntensity}</Text>
            <Text style={styles.totalLabel}>total intensity</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={[styles.totalValue, { color: labelColor }]}>
              {entry.dailyScore > 0 ? '+' : ''}{entry.dailyScore.toFixed(1)}
            </Text>
            <Text style={styles.totalLabel}>score</Text>
          </View>
        </View>

        {/* Journal notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journal Notes</Text>
          {entry.emotions.map((emotion, i) => (
            <View key={i} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={[
                  styles.noteDot,
                  { backgroundColor: EMOTION_COLORS[emotion.coreEmotion] },
                ]} />
                <Text style={styles.noteEmotion}>{emotion.derivative}</Text>
                <Text style={styles.noteIntensity}>intensity {emotion.intensity}</Text>
              </View>
              <Text style={styles.noteText}>{emotion.journalNote}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, spacing: any, fontSize: any, radius: any) => 
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
    flexShrink:      0,
  },
  closeText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
    gap:  2,
  },
  headerDate: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
    lineHeight: 24,
  },
  headerSub: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },

  // Score card
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    alignItems:      'center',
    borderWidth:     2,
    gap:             spacing.sm,
  },
  scoreLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.sm,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreNumber: {
    fontSize:   64,
    fontWeight: '800',
    lineHeight: 72,
  },
  scoreBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
  },
  scoreBadgeText: {
    color:      colors.textDark,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  scoreCardHint: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Sections
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },

  // Per-session table
  sessionsTable: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
  },
  sessionRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    gap:               spacing.md,
  },
  sessionRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sessionTime: {
    color:      colors.textMuted,
    fontSize:   fontSize.xs,
    width:      68,
    flexShrink: 0,
  },
  sessionEmotions: {
    color:    colors.white,
    fontSize: fontSize.sm,
    flex:     1,
  },
  sessionScore: {
    fontSize:   fontSize.sm,
    fontWeight: '800',
    flexShrink: 0,
  },

  // Emotions table
  emotionsTable: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tableHeader: {
    backgroundColor: colors.cardAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    color:         colors.textMuted,
    fontSize:      fontSize.xs,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    flex: 1,
  },
  tableCellText: {
    fontSize: fontSize.sm,
    color:    colors.white,
  },
  tableCellEmotion: {
    flex: 2,
  },
  tableCellIntensity: {
    flex:      1,
    textAlign: 'center',
  },
  tableCellScore: {
    flex:      1,
    textAlign: 'right',
  },
  emotionCell: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  emotionDot: {
    width:        10,
    height:       10,
    borderRadius: radius.full,
    flexShrink:   0,
  },
  emotionName: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },
  emotionTier: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  intensityText: {
    color:      colors.white,
    fontWeight: '600',
    textAlign:  'center',
  },
  scoreText: {
    fontWeight: '800',
    textAlign:  'right',
  },

  // Totals
  totalsRow: {
    flexDirection:   'row',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  totalItem: {
    flex:       1,
    alignItems: 'center',
    gap:        spacing.xs,
  },
  totalValue: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  totalLabel: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  totalDivider: {
    width:           1,
    backgroundColor: colors.border,
    marginVertical:  spacing.xs,
  },

  // Notes
  noteCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.md,
    padding:         spacing.md,
    gap:             spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  noteDot: {
    width:        10,
    height:       10,
    borderRadius: radius.full,
    flexShrink:   0,
  },
  noteEmotion: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
    flex:       1,
  },
  noteIntensity: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  noteText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 20,
  },
});