import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Theme } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import { scoreSession, getScoreLabel } from '../../core/scoringEngine';
import { store } from '../../data/store';
import { EMOTION_COLORS } from '../EmotionWheel/WheelItem';
import type { CompletedEmotion } from '../EmotionDetail/EmotionDetailScreen';
import type { EmotionInput } from '../../core/types';
import type { DailyAggregate } from '../../data/storageTypes';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  emotions:  CompletedEmotion[];
  onSave:    () => void;
  onEdit:    () => void;
}

// ── Score color ───────────────────────────────────────────────────────────────

function scoreColor(score: number, colors: Theme): string {
  if (score >= 2)  return '#4CAF50';
  if (score >= -2) return colors.gold;
  return '#EF5350';
}

// ── Children's mode detection & dampening ────────────────────────────────────

const CHILDREN_LABELS = ['Happy', 'Sad', 'Angry', 'Nervous', 'Bored'];

function computeResult(emotions: CompletedEmotion[]) {
  const inputs: EmotionInput[] = emotions.map(e => ({
    coreEmotion: e.coreEmotion,
    tier:        e.tier,
    derivative:  e.derivative,
    intensity:   e.intensity,
    journalNote: e.journalNote,
  }));

  const rawResult      = scoreSession(inputs);
  const isChildrenEntry = inputs.every(e => CHILDREN_LABELS.includes(e.derivative));

  if (!isChildrenEntry) return rawResult;

  // For children's entries, scale score by avg intensity / 10
  // so the intensity level meaningfully affects the final score
  const avgIntensity    = rawResult.totalIntensity / rawResult.emotions.length;
  const intensityFactor = avgIntensity / 10;
  const dampened        = Math.round(rawResult.dailyScore * intensityFactor * 100) / 100;

  return {
    ...rawResult,
    dailyScore:     dampened,
    scoreLabel:     getScoreLabel(dampened),
    isDifficultDay: dampened <= -8,
  };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EntrySummaryScreen({ emotions, onSave, onEdit }: Props) {
  const [saving, setSaving]               = useState(false);
  const [existingToday, setExistingToday] = useState<DailyAggregate | null>(null);

   const { colors, spacing, fontSize, radius } = useTheme();

    const styles = useMemo(
        () => createStyles(colors, spacing, fontSize, radius),
        [colors, spacing, fontSize, radius]
    );

  const result     = computeResult(emotions);
  const labelColor = scoreColor(result.dailyScore, colors);
  const today      = new Date().toISOString().slice(0, 10);

  // Look up whether today already has entries logged, so the user knows
  // saving will add to today's average rather than replace anything.
  useEffect(() => {
    let cancelled = false;
    store.getEntry(today).then(r => {
      if (!cancelled && r.ok) setExistingToday(r.value);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    const saveResult = await store.saveEntry(today, result);
    if (!saveResult.ok) {
      console.error('Failed to save entry:', saveResult.error);
    }
    setSaving(false);
    onSave();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Summary</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month:   'long',
              day:     'numeric',
            })}
          </Text>
        </View>

        {/* Existing entries today notice */}
        {existingToday && existingToday.sessionCount > 0 && (
          <View style={styles.existingNotice}>
            <Text style={styles.existingNoticeText}>
              You've already logged {existingToday.sessionCount}{' '}
              {existingToday.sessionCount === 1 ? 'entry' : 'entries'} today
              {' '}(currently averaging{' '}
              {existingToday.dailyScore > 0 ? '+' : ''}{existingToday.dailyScore.toFixed(1)}).
              Saving this will add it as another entry, and today's score
              will update to the average of all of them.
            </Text>
          </View>
        )}

        {/* Score card */}
        <View style={[styles.scoreCard, { borderColor: labelColor }]}>
          <Text style={styles.scoreCardLabel}>
            {existingToday && existingToday.sessionCount > 0 ? 'This Entry\'s Score' : 'Daily Score'}
          </Text>
          <Text style={[styles.scoreNumber, { color: labelColor }]}>
            {result.dailyScore > 0 ? '+' : ''}{result.dailyScore.toFixed(2)}
          </Text>
          <View style={[styles.scoreLabelBadge, { backgroundColor: labelColor }]}>
            <Text style={styles.scoreLabelText}>{result.scoreLabel}</Text>
          </View>

          {/* Difficult day prompt */}
          {result.isDifficultDay && (
            <View style={styles.difficultDayPrompt}>
              <Text style={styles.difficultDayText}>
                It sounds like today was really hard. Be gentle with yourself —
                reaching out to someone you trust can make a difference.
              </Text>
            </View>
          )}
        </View>

        {/* Emotion breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
          {result.emotions.map((emotion, i) => {
            const emotionColor = EMOTION_COLORS[emotion.coreEmotion];
            const contribution = emotion.weightedScore;
            const isPositive   = contribution >= 0;
            return (
              <View key={i} style={styles.emotionRow}>

                {/* Color dot */}
                <View style={[styles.emotionDot, { backgroundColor: emotionColor }]} />

                {/* Name and tier */}
                <View style={styles.emotionInfo}>
                  <Text style={styles.emotionName}>{emotion.derivative}</Text>
                  <Text style={styles.emotionMeta}>
                    {emotion.tier} · intensity {emotion.intensity}
                  </Text>
                </View>

                {/* Score contribution */}
                <View style={styles.emotionScores}>
                  <Text style={[
                    styles.emotionContribution,
                    { color: isPositive ? '#4CAF50' : '#EF5350' },
                  ]}>
                    {isPositive ? '+' : ''}{contribution.toFixed(2)}
                  </Text>
                  <Text style={styles.emotionTierScore}>
                    tier {emotion.tierScore > 0 ? '+' : ''}{emotion.tierScore}
                  </Text>
                </View>

              </View>
            );
          })}
        </View>

        {/* Totals row */}
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{result.emotions.length}</Text>
            <Text style={styles.totalLabel}>emotions</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{result.totalIntensity}</Text>
            <Text style={styles.totalLabel}>total intensity</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={[styles.totalValue, { color: labelColor }]}>
              {result.dailyScore > 0 ? '+' : ''}{result.dailyScore.toFixed(1)}
            </Text>
            <Text style={styles.totalLabel}>score</Text>
          </View>
        </View>

        {/* Journal notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Notes</Text>
          {result.emotions.map((emotion, i) => (
            <View key={i} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={[
                  styles.noteDot,
                  { backgroundColor: EMOTION_COLORS[emotion.coreEmotion] },
                ]} />
                <Text style={styles.noteEmotion}>{emotion.derivative}</Text>
              </View>
              <Text style={styles.noteText}>{emotion.journalNote}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.textDark} />
            : <Text style={styles.saveButtonText}>
                {existingToday && existingToday.sessionCount > 0 ? 'Add Entry' : 'Save Entry'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          activeOpacity={0.7}
        >
          <Text style={styles.editButtonText}>← Edit emotions</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

  // Header
  header: {
    gap: spacing.xs,
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  headerDate: {
    color:    colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Existing entries today notice
  existingNotice: {
    backgroundColor: 'rgba(107,79,160,0.12)',
    borderRadius:    radius.md,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     'rgba(107,79,160,0.3)',
  },
  existingNoticeText: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    lineHeight: 20,
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
  scoreCardLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.sm,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreNumber: {
    fontSize:   72,
    fontWeight: '800',
    lineHeight: 80,
  },
  scoreLabelBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
  },
  scoreLabelText: {
    color:      colors.textDark,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  difficultDayPrompt: {
    backgroundColor: 'rgba(239,83,80,0.12)',
    borderRadius:    radius.md,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     'rgba(239,83,80,0.3)',
    marginTop:       spacing.sm,
  },
  difficultDayText: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    lineHeight: 22,
    textAlign:  'center',
  },

  // Breakdown
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  emotionRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.md,
    padding:         spacing.md,
    gap:             spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  emotionDot: {
    width:        12,
    height:       12,
    borderRadius: radius.full,
    flexShrink:   0,
  },
  emotionInfo: {
    flex: 1,
    gap:  2,
  },
  emotionName: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  emotionMeta: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  emotionScores: {
    alignItems: 'flex-end',
    gap:        2,
  },
  emotionContribution: {
    fontSize:   fontSize.md,
    fontWeight: '800',
  },
  emotionTierScore: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
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
    flex:           1,
    alignItems:     'center',
    gap:            spacing.xs,
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
  },
  noteEmotion: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  noteText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 20,
  },

  // Buttons
  saveButton: {
    backgroundColor: colors.purple,
    borderRadius:    radius.md,
    paddingVertical: spacing.lg,
    alignItems:      'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '800',
  },
  editButton: {
    alignItems:      'center',
    paddingVertical: spacing.md,
  },
  editButtonText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.md,
    fontWeight: '600',
  },
});