import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Modal,
} from 'react-native';
import { spacing, fontSize, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import {
  CHILDREN_EMOTIONS,
  CHILDREN_INTENSITY_LEVELS,
  type ChildEmotion,
  type IntensityLevel,
} from '../../core/childrenMode';
import type { CompletedEmotion } from '../EmotionDetail/EmotionDetailScreen';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onEmotionCompleted: (emotion: CompletedEmotion) => void;
  onDone:             () => void;
  onClose:            () => void;
  completedCount:     number;
}

// ── Info modal ────────────────────────────────────────────────────────────────

function EmotionInfoModal({
  emotion,
  onClose,
}: {
  emotion: ChildEmotion;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  const infoStyles = useMemo(
    () => createInfoStyles(colors),
    [colors]
  );
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={infoStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[infoStyles.card, { borderColor: emotion.color }]}>
          <Text style={infoStyles.emoji}>{emotion.emoji}</Text>
          <Text style={[infoStyles.title, { color: emotion.color }]}>
            {emotion.label}
          </Text>
          <Text style={infoStyles.definition}>{emotion.definition}</Text>
          <View style={infoStyles.divider} />
          <Text style={infoStyles.exampleLabel}>FOR EXAMPLE</Text>
          <Text style={infoStyles.example}>{emotion.example}</Text>
          <Text style={infoStyles.dismiss}>Tap anywhere to close</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createInfoStyles = (colors: any) => 
  StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    width:           '100%',
    borderWidth:     2,
    alignItems:      'center',
    gap:             spacing.sm,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  definition: {
    color:      colors.white,
    fontSize:   fontSize.md,
    lineHeight: 24,
    textAlign:  'center',
  },
  divider: {
    width:           '100%',
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.sm,
  },
  exampleLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.xs,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  example: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    lineHeight: 22,
    textAlign:  'center',
    fontStyle:  'italic',
  },
  dismiss: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    marginTop: spacing.sm,
  },
});

// ── Intensity selector ────────────────────────────────────────────────────────

function IntensitySelector({
  emotion,
  onSelect,
}: {
  emotion:  ChildEmotion;
  onSelect: (level: IntensityLevel) => void;
}) {
  const [selected, setSelected] = useState<IntensityLevel | null>(null);
  const { colors } = useTheme();

  const intensityStyles = useMemo(
    () => createIntensityStyles(colors),
    [colors]
  );

  return (
    <View style={intensityStyles.container}>
      <Text style={intensityStyles.question}>
        How {emotion.label.toLowerCase()} did you feel?
      </Text>
      <View style={intensityStyles.levels}>
        {CHILDREN_INTENSITY_LEVELS.map(level => (
          <TouchableOpacity
            key={level.value}
            style={[
              intensityStyles.levelCard,
              selected?.value === level.value && {
                borderColor:     emotion.color,
                backgroundColor: emotion.color + '22',
              },
            ]}
            onPress={() => setSelected(level)}
            activeOpacity={0.75}
          >
            <Text style={intensityStyles.levelEmoji}>{level.emoji}</Text>
            <Text style={[
              intensityStyles.levelLabel,
              selected?.value === level.value && { color: emotion.color },
            ]}>
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected && (
        <TouchableOpacity
          style={[intensityStyles.confirmButton, { backgroundColor: emotion.color }]}
          onPress={() => onSelect(selected)}
          activeOpacity={0.8}
        >
          <Text style={intensityStyles.confirmText}>That's right ✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createIntensityStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  question: {
    color:      colors.white,
    fontSize:   fontSize.lg,
    fontWeight: '700',
    textAlign:  'center',
    lineHeight: 28,
  },
  levels: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    justifyContent: 'center',
  },
  levelCard: {
    width:           '45%',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    alignItems:      'center',
    gap:             spacing.sm,
    borderWidth:     2,
    borderColor:     colors.border,
  },
  levelEmoji: {
    fontSize: 36,
  },
  levelLabel: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
    textAlign:  'center',
  },
  confirmButton: {
    borderRadius:    radius.md,
    paddingVertical: spacing.lg,
    alignItems:      'center',
    marginTop:       spacing.sm,
  },
  confirmText: {
    color:      colors.textDark,
    fontSize:   fontSize.lg,
    fontWeight: '800',
  },
});

// ── Journal prompt ────────────────────────────────────────────────────────────

function JournalPrompt({
  emotion,
  onSubmit,
}: {
  emotion:  ChildEmotion;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Import TextInput here to keep the component self-contained
  const { TextInput } = require('react-native');

  function handleSubmit() {
    if (!note.trim()) {
      setError('Please write something before continuing.');
      return;
    }
    onSubmit(note.trim());
  }
  const { colors } = useTheme();

  const journalStyles = useMemo(
    () => createJournalStyles(colors),
    [colors]
  );

  return (
    <View style={journalStyles.container}>
      <Text style={journalStyles.prompt}>{emotion.journalPrompt}</Text>
      <Text style={journalStyles.hint}>
        Write one or two sentences. There are no wrong answers!
      </Text>
      <TextInput
        style={[journalStyles.input, error ? journalStyles.inputError : null]}
        placeholder="Type here..."
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={(t: string) => { setNote(t); setError(''); }}
        multiline
        numberOfLines={3}
        maxLength={300}
        textAlignVertical="top"
      />
      {error ? (
        <Text style={journalStyles.error}>{error}</Text>
      ) : (
        <Text style={journalStyles.charCount}>{note.length} / 300</Text>
      )}
      <TouchableOpacity
        style={[journalStyles.button, { backgroundColor: emotion.color }]}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Text style={journalStyles.buttonText}>Done ✓</Text>
      </TouchableOpacity>
    </View>
  );
}

const createJournalStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  prompt: {
    color:      colors.white,
    fontSize:   fontSize.lg,
    fontWeight: '700',
    textAlign:  'center',
    lineHeight: 28,
  },
  hint: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    textAlign:  'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius:    radius.md,
    borderWidth:     1.5,
    borderColor:     colors.border,
    color:           colors.white,
    fontSize:        fontSize.md,
    padding:         spacing.md,
    minHeight:       100,
    lineHeight:      24,
  },
  inputError: {
    borderColor: '#EF5350',
  },
  error: {
    color:    '#EF5350',
    fontSize: fontSize.sm,
  },
  charCount: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    textAlign: 'right',
  },
  button: {
    borderRadius:    radius.md,
    paddingVertical: spacing.lg,
    alignItems:      'center',
    marginTop:       spacing.sm,
  },
  buttonText: {
    color:      colors.textDark,
    fontSize:   fontSize.lg,
    fontWeight: '800',
  },
});

// ── Step type ─────────────────────────────────────────────────────────────────

type Step = 'select' | 'intensity' | 'journal';

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChildrenWheelScreen({
  onEmotionCompleted, onDone, onClose, completedCount,
}: Props) {
   const { colors } = useTheme();

    const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [step, setStep]                   = useState<Step>('select');
  const [selectedEmotion, setSelectedEmotion] = useState<ChildEmotion | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<IntensityLevel | null>(null);
  const [infoEmotion, setInfoEmotion]     = useState<ChildEmotion | null>(null);

  function handleEmotionSelect(emotion: ChildEmotion) {
    setSelectedEmotion(emotion);
    setSelectedLevel(null);
    setStep('intensity');
  }

  function handleIntensitySelect(level: IntensityLevel) {
    setSelectedLevel(level);
    setStep('journal');
  }

  function handleJournalSubmit(note: string) {
    if (!selectedEmotion || !selectedLevel) return;
    onEmotionCompleted({
      coreEmotion: selectedEmotion.coreEmotion,
      tier:        selectedEmotion.tier,
      derivative:  selectedEmotion.label,
      intensity:   selectedLevel.value,
      journalNote: note,
    });
    // Reset for next emotion
    setStep('select');
    setSelectedEmotion(null);
    setSelectedLevel(null);
  }

  function handleBack() {
    if (step === 'journal')    { setStep('intensity'); return; }
    if (step === 'intensity')  { setStep('select');    return; }
    onClose();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'select'    ? 'How are you feeling?' : ''}
            {step === 'intensity' ? selectedEmotion?.label ?? '' : ''}
            {step === 'journal'   ? 'Tell me more' : ''}
          </Text>
          {completedCount > 0 ? (
            <TouchableOpacity onPress={onDone} style={styles.doneButton}>
              <Text style={styles.doneText}>Done ({completedCount})</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {(['select', 'intensity', 'journal'] as Step[]).map(s => (
            <View
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Step content */}
        {step === 'select' && (
          <View style={styles.emotionGrid}>
            {CHILDREN_EMOTIONS.map(emotion => (
              <View key={emotion.id} style={styles.emotionWrapper}>
                <TouchableOpacity
                  style={[styles.emotionCard, { borderColor: emotion.color }]}
                  onPress={() => handleEmotionSelect(emotion)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={[styles.emotionLabel, { color: emotion.color }]}>
                    {emotion.label}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => setInfoEmotion(emotion)}
                >
                  <Text style={styles.infoButtonText}>What is this?</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {step === 'intensity' && selectedEmotion && (
          <View style={styles.stepContent}>
            <View style={[styles.emotionHeader, { borderColor: selectedEmotion.color }]}>
              <Text style={styles.stepEmoji}>{selectedEmotion.emoji}</Text>
              <Text style={[styles.stepEmotionName, { color: selectedEmotion.color }]}>
                {selectedEmotion.label}
              </Text>
            </View>
            <IntensitySelector
              emotion={selectedEmotion}
              onSelect={handleIntensitySelect}
            />
          </View>
        )}

        {step === 'journal' && selectedEmotion && selectedLevel && (
          <View style={styles.stepContent}>
            <View style={[styles.emotionHeader, { borderColor: selectedEmotion.color }]}>
              <Text style={styles.stepEmoji}>{selectedEmotion.emoji}</Text>
              <Text style={[styles.stepEmotionName, { color: selectedEmotion.color }]}>
                {selectedEmotion.label}
              </Text>
              <Text style={styles.intensitySummary}>
                {selectedLevel.emoji} {selectedLevel.label}
              </Text>
            </View>
            <JournalPrompt
              emotion={selectedEmotion}
              onSubmit={handleJournalSubmit}
            />
          </View>
        )}

      </ScrollView>

      {/* Info modal */}
      {infoEmotion && (
        <EmotionInfoModal
          emotion={infoEmotion}
          onClose={() => setInfoEmotion(null)}
        />
      )}

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
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.xs,
    minWidth:          60,
  },
  backText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   fontSize.lg,
    fontWeight: '700',
    flex:       1,
    textAlign:  'center',
  },
  doneButton: {
    minWidth:   80,
    alignItems: 'flex-end',
  },
  doneText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  progressDots: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            spacing.sm,
  },
  dot: {
    width:           10,
    height:          10,
    borderRadius:    radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.purple,
    width:           24,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md,
    justifyContent: 'center',
  },
  emotionWrapper: {
    width:      '45%',
    alignItems: 'center',
    gap:        spacing.xs,
  },
  emotionCard: {
    width:           '100%',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    alignItems:      'center',
    gap:             spacing.sm,
    borderWidth:     2,
  },
  emotionEmoji: {
    fontSize: 48,
  },
  emotionLabel: {
    fontSize:   fontSize.lg,
    fontWeight: '800',
  },
  infoButton: {
    paddingVertical: spacing.xs,
  },
  infoButtonText: {
    color:      colors.textMuted,
    fontSize:   fontSize.xs,
    fontWeight: '600',
  },
  stepContent: {
    gap: spacing.lg,
  },
  emotionHeader: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    alignItems:      'center',
    borderWidth:     2,
    gap:             spacing.xs,
  },
  stepEmoji: {
    fontSize: 48,
  },
  stepEmotionName: {
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  intensitySummary: {
    color:    colors.textMuted,
    fontSize: fontSize.sm,
  },
});