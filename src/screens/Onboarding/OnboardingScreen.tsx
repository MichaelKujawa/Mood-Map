import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive } from '../../theme/responsive';

// ── Tooltip content — matches the 7-step spec exactly ────────────────────────

const STEPS = [
  {
    title: 'History',
    highlight: 'bottomLeft',
    text: 'This is the History tab. Here you can view past entries by day, month, or year. History displays important overall stats and trends related to your emotions, intensity, and total scores.',
  },
  {
    title: 'Insight',
    highlight: 'bottomRight',
    text: 'This is the Insights tab. Here you will find articles and advice based on common entry topics or emotional trends. Trends are based on both frequency and intensity.',
  },
  {
    title: 'New Entry',
    highlight: 'topLeft',
    text: 'This is the New Entry tab. Tapping this allows you to log your emotions for the day. Your graph will begin generating once you have made a few entries.',
  },
  {
    title: 'Settings',
    highlight: 'topRight',
    text: 'This is the Settings tab. Here you can change your preferences, visual mode, or revisit this tutorial at any time.',
  },
  {
    title: 'Emotion Wheel',
    highlight: 'center',
    text: 'The Emotion Wheel lets you scroll through eight base emotions rooted in Plutchik\'s Wheel of Emotions. Each emotion has milder and more intense variations displayed on either side.',
  },
  {
    title: 'Intensity Slider',
    highlight: 'center',
    text: 'The intensity slider works on a scale of 1 to 10. A 1 means you barely felt the emotion. A 10 means it was all you could think about. Use it after selecting an emotion.',
  },
  {
    title: 'You\'re all set!',
    highlight: 'newEntry',
    text: 'Tap New Entry below to log your first emotion and start building your emotional picture.',
    isFinal: true,
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingScreen({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
      const { colors, spacing, fontSize, radius } = useTheme();
      const { width } = useResponsive();

    const styles = useMemo(
        () => createStyles(colors, spacing, fontSize, radius, width),
        [colors, spacing, fontSize, radius, width]
    );

  const current = STEPS[step];
  const isFinal = step === STEPS.length - 1;

  function advance() {
    // Fade out → update step → fade in
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      if (step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else {
        onComplete();
      }
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={isFinal ? undefined : advance}
    >
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Skip button — hidden on final step */}
      {!isFinal && (
        <SafeAreaView style={styles.skipContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Tooltip card */}
      <Animated.View style={[styles.tooltipCard, styles.tooltipCenter, { opacity: fadeAnim }]}>
        <Text style={styles.tooltipTitle}>{current.title}</Text>
        <Text style={styles.tooltipText}>{current.text}</Text>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        {/* Action button on final step */}
        {isFinal && (
          <TouchableOpacity style={styles.finalButton} onPress={onComplete}>
            <Text style={styles.finalButtonText}>Begin →</Text>
          </TouchableOpacity>
        )}

        {/* Tap hint on non-final steps */}
        {!isFinal && (
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// width is now the live value from useResponsive() instead of a module-level
// Dimensions.get('window') snapshot, so the tooltip re-measures on rotation.
// It's also capped at 480 so the card doesn't stretch edge-to-edge on a
// tablet — same "respond, but don't go desktop-wide" cap used elsewhere.

const createStyles = (colors: any, spacing: any, fontSize: any, radius: any, width: number) => 
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  skipContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  skipButton: {
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
  },
  skipText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tooltipCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipCenter: {
    width: Math.min(width - spacing.lg * 2, 480),
  },
  tooltipTitle: {
    color: colors.purpleLight,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  tooltipText: {
    color: colors.white,
    fontSize: fontSize.md,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.purple,
    width: 20,
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  finalButton: {
    backgroundColor: colors.purple,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  finalButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});