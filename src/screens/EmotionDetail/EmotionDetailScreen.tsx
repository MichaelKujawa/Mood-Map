import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, SafeAreaView,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { CoreEmotion, EmotionTier } from '../../core/types';
import { EMOTION_COLORS, DERIVATIVE_NAMES } from '../EmotionWheel/WheelItem';

export interface CompletedEmotion {
  coreEmotion:  CoreEmotion;
  tier:         EmotionTier;
  derivative:   string;
  intensity:    number;
  journalNote:  string;
}

interface Props {
  coreEmotion:  CoreEmotion;
  tier:         EmotionTier;
  derivative:   string;
  entryNumber:  number;
  totalSoFar:   number;
  onConfirm:    (emotion: CompletedEmotion) => void;
  onBack:       () => void;
  onDone:       (emotion: CompletedEmotion) => void;
}

const SLIDER_MIN = 1;
const SLIDER_MAX = 10;
const STEPS = Array.from(
  { length: SLIDER_MAX - SLIDER_MIN + 1 },
  (_, i) => i + SLIDER_MIN,
);

function IntensitySlider({
  value, onChange, color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();

  const sliderStyles = useMemo(
    () => createSliderStyles(colors, spacing, fontSize, radius),
    [colors, spacing, fontSize, radius]
  );
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.track}>
        <View style={[
          sliderStyles.fill,
          {
            width: `${((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%`,
            backgroundColor: color,
          },
        ]} />
      </View>
      <View style={sliderStyles.steps}>
        {STEPS.map(step => (
          <TouchableOpacity
            key={step}
            style={[sliderStyles.step, value === step && { backgroundColor: color }]}
            onPress={() => onChange(step)}
            activeOpacity={0.7}
          >
            <Text style={[
              sliderStyles.stepText,
              value === step && sliderStyles.stepTextActive,
            ]}>
              {step}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.label}>Barely felt it</Text>
        <Text style={sliderStyles.label}>All-consuming</Text>
      </View>
    </View>
  );
}

const createSliderStyles = (colors: any, spacing: any, fontSize: any, radius: any) => StyleSheet.create({
  container: { gap: spacing.sm },
  track: {
    height:          6,
    backgroundColor: colors.border,
    borderRadius:    radius.full,
    overflow:        'hidden',
  },
  fill: {
    height:       '100%',
    borderRadius: radius.full,
  },
  steps: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            4,
  },
  step: {
    flex:            1,
    height:          36,
    borderRadius:    radius.sm,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.card,
  },
  stepText: {
    color:      colors.textMuted,
    fontSize:   fontSize.xs,
    fontWeight: '600',
  },
  stepTextActive: {
    color:      colors.textDark,
    fontWeight: '800',
  },
  labels: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  label: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
});

const JOURNAL_PROMPTS: Record<CoreEmotion, string> = {
  Joy:          'What caused you to feel this way?',
  Trust:        'What or who made you feel this way?',
  Anticipation: 'What are you looking forward to or preparing for?',
  Surprise:     'What happened that you did not expect?',
  Fear:         'What felt threatening or unsafe?',
  Sadness:      'What led to this feeling?',
  Disgust:      'What did you find unacceptable or off-putting?',
  Anger:        'What felt wrong or unfair?',
};

export default function EmotionDetailScreen({
  coreEmotion, tier, derivative,
  entryNumber, totalSoFar,
  onConfirm, onBack, onDone,
}: Props) {
      const { colors, spacing, fontSize, radius } = useTheme();

    const styles = useMemo(
        () => createStyles(colors, spacing, fontSize, radius),
        [colors, spacing, fontSize, radius]
    );

  const [intensity,   setIntensity]   = useState(5);
  const [journalNote, setJournalNote] = useState('');
  const [error,       setError]       = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const emotionColor = EMOTION_COLORS[coreEmotion];
  const prompt       = JOURNAL_PROMPTS[coreEmotion];

  const sentenceCount = journalNote
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0).length;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function validate(): boolean {
    if (!journalNote.trim()) {
      setError('Please write at least one sentence about what caused this feeling.');
      shake();
      return false;
    }
    if (sentenceCount > 4) {
      setError('Please keep your note to 4 sentences or fewer.');
      shake();
      return false;
    }
    setError('');
    return true;
  }

  function buildEmotion(): CompletedEmotion {
    return {
      coreEmotion,
      tier,
      derivative,
      intensity,
      journalNote: journalNote.trim(),
    };
  }

  function handleConfirm() {
    if (!validate()) return;
    onConfirm(buildEmotion());
  }

  function handleDone() {
    if (!validate()) return;
    onDone(buildEmotion());
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerSub}>
              Emotion {entryNumber}{totalSoFar > 0 ? ` · ${totalSoFar} saved` : ''}
            </Text>
          </View>

          {/* Emotion card */}
          <View style={[styles.emotionCard, { borderColor: emotionColor }]}>
            <View style={[styles.emotionBadge, { backgroundColor: emotionColor }]}>
              <Text style={styles.emotionBadgeText}>{derivative}</Text>
            </View>
            <Text style={styles.emotionSub}>
              {tier} · {coreEmotion}
            </Text>
          </View>

          {/* Intensity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How intensely did you feel this?</Text>
            <View style={styles.intensityDisplay}>
              <Text style={[styles.intensityNumber, { color: emotionColor }]}>
                {intensity}
              </Text>
              <Text style={styles.intensityMax}>/10</Text>
            </View>
            <IntensitySlider
              value={intensity}
              onChange={setIntensity}
              color={emotionColor}
            />
          </View>

          {/* Journal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{prompt}</Text>
            <Text style={styles.sectionSub}>
              Write 1–4 sentences. Be as specific as you can.
            </Text>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <TextInput
                style={[
                  styles.journalInput,
                  error ? styles.journalInputError : null,
                ]}
                placeholder="Type here..."
                placeholderTextColor={colors.textMuted}
                value={journalNote}
                onChangeText={text => { setJournalNote(text); setError(''); }}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
            </Animated.View>
            <View style={styles.noteFooter}>
              {error
                ? <Text style={styles.errorText}>{error}</Text>
                : <Text style={styles.sentenceCount}>{sentenceCount} / 4 sentences</Text>
              }
              <Text style={styles.charCount}>{journalNote.length} / 500</Text>
            </View>
          </View>

          {/* Save & add another */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: emotionColor }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              Save & add another emotion
            </Text>
          </TouchableOpacity>

          {/* Finished */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>
              Finished adding emotions →
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  backText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },
  headerSub: {
    color:    colors.textMuted,
    fontSize: fontSize.sm,
  },
  emotionCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    alignItems:      'center',
    borderWidth:     2,
    gap:             spacing.sm,
  },
  emotionBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:      radius.md,
  },
  emotionBadgeText: {
    color:      colors.textDark,
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  emotionSub: {
    color:         colors.textMuted,
    fontSize:      fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight:    '600',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
    lineHeight: 24,
  },
  sectionSub: {
    color:     colors.textMuted,
    fontSize:  fontSize.sm,
    marginTop: -spacing.sm,
  },
  intensityDisplay: {
    flexDirection:  'row',
    alignItems:     'baseline',
    justifyContent: 'center',
    gap:            4,
  },
  intensityNumber: {
    fontSize:   fontSize.hero,
    fontWeight: '800',
    lineHeight: fontSize.hero * 1.1,
  },
  intensityMax: {
    color:    colors.textMuted,
    fontSize: fontSize.xl,
  },
  journalInput: {
    backgroundColor: colors.card,
    borderRadius:    radius.md,
    borderWidth:     1.5,
    borderColor:     colors.border,
    color:           colors.white,
    fontSize:        fontSize.md,
    padding:         spacing.md,
    minHeight:       120,
    lineHeight:      24,
  },
  journalInputError: {
    borderColor: '#E74C3C',
  },
  noteFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  sentenceCount: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  errorText: {
    color:    '#E74C3C',
    fontSize: fontSize.xs,
    flex:     1,
  },
  charCount: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
  },
  confirmButton: {
    borderRadius:    radius.md,
    paddingVertical: spacing.lg,
    alignItems:      'center',
  },
  confirmButtonText: {
    color:      colors.textDark,
    fontSize:   fontSize.md,
    fontWeight: '800',
  },
  doneButton: {
    alignItems:      'center',
    paddingVertical: spacing.md,
  },
  doneButtonText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.md,
    fontWeight: '600',
  },
});