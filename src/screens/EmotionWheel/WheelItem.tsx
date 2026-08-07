import React, {useMemo} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { spacing, fontSize, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import type { CoreEmotion, EmotionTier } from '../../core/types';

export const EMOTION_COLORS: Record<CoreEmotion, string> = {
  Joy:          '#FFD700',
  Trust:        '#90C97A',
  Anticipation: '#FFA500',
  Surprise:     '#A8D8EA',
  Fear:         '#7BC67E',
  Sadness:      '#6B9FD4',
  Disgust:      '#9B59B6',
  Anger:        '#E74C3C',
};

export const DERIVATIVE_NAMES: Record<CoreEmotion, Record<EmotionTier, string>> = {
  Joy:          { mild: 'Serenity',     core: 'Joy',          intense: 'Ecstasy'    },
  Trust:        { mild: 'Acceptance',   core: 'Trust',        intense: 'Admiration' },
  Anticipation: { mild: 'Interest',     core: 'Anticipation', intense: 'Vigilance'  },
  Surprise:     { mild: 'Distraction',  core: 'Surprise',     intense: 'Amazement'  },
  Fear:         { mild: 'Apprehension', core: 'Fear',         intense: 'Terror'     },
  Sadness:      { mild: 'Pensiveness',  core: 'Sadness',      intense: 'Grief'      },
  Disgust:      { mild: 'Boredom',      core: 'Disgust',      intense: 'Loathing'   },
  Anger:        { mild: 'Annoyance',    core: 'Anger',        intense: 'Rage'       },
};

// ── Per-derivative examples ───────────────────────────────────────────────────
// Every tier of every emotion has its own real-life example.
// Core emotion also has a plain-language definition shown first.

export interface EmotionInfo {
  definition?: string;  // only shown for core tier
  example:     string;
}

export const EMOTION_INFO: Record<CoreEmotion, Record<EmotionTier, EmotionInfo>> = {
  Joy: {
    mild:    { example: 'You might feel Serenity sitting quietly outside on a warm afternoon with nowhere to be.' },
    core:    { definition: 'A feeling of great pleasure, happiness, or contentment.', example: 'You might feel Joy when reuniting with someone you love after a long time apart.' },
    intense: { example: 'You might feel Ecstasy hearing the final score of a game your team just won after years of losing.' },
  },
  Trust: {
    mild:    { example: 'You might feel Acceptance when a new coworker remembers how you take your coffee without being told.' },
    core:    { definition: 'A firm belief in the reliability, honesty, or ability of someone or something.', example: 'You might feel Trust when a friend keeps a secret you confided in them.' },
    intense: { example: 'You might feel Admiration watching someone you respect handle an incredibly difficult situation with grace.' },
  },
  Anticipation: {
    mild:    { example: 'You might feel Interest when a topic comes up in conversation that you have never thought about before.' },
    core:    { definition: 'Excitement or anxiety about a future event you are preparing for or looking forward to.', example: 'You might feel Anticipation the night before starting a new job.' },
    intense: { example: 'You might feel Vigilance waiting for test results that could significantly change your life.' },
  },
  Surprise: {
    mild:    { example: 'You might feel Distraction when a notification pulls your attention away from something you were focused on.' },
    core:    { definition: 'A sudden feeling caused by something unexpected — can be pleasant or unsettling.', example: 'You might feel Surprise when friends throw you an unexpected birthday party.' },
    intense: { example: 'You might feel Amazement watching a performer do something you genuinely did not believe was humanly possible.' },
  },
  Fear: {
    mild:    { example: 'You might feel Apprehension walking into a room full of strangers where you do not know anyone.' },
    core:    { definition: 'An unpleasant emotion caused by the belief that something is dangerous or threatening.', example: 'You might feel Fear when walking alone at night and hearing unexpected footsteps close behind you.' },
    intense: { example: 'You might feel Terror realizing you are in a situation you have no control over and cannot escape.' },
  },
  Sadness: {
    mild:    { example: 'You might feel Pensiveness looking through old photos of a time in your life that has passed.' },
    core:    { definition: 'A feeling of sorrow or grief often caused by loss or disappointment.', example: 'You might feel Sadness when a close friendship slowly drifts apart.' },
    intense: { example: 'You might feel Grief after losing someone whose presence shaped who you are.' },
  },
  Disgust: {
    mild:    { example: 'You might feel Boredom sitting in a meeting that has nothing to do with your work and shows no sign of ending.' },
    core:    { definition: 'A strong feeling of revulsion or disapproval toward something offensive or unacceptable.', example: 'You might feel Disgust watching someone in a position of power treat others with contempt.' },
    intense: { example: 'You might feel Loathing toward a person whose repeated actions have proven them to be genuinely cruel.' },
  },
  Anger: {
    mild:    { example: 'You might feel Annoyance when someone interrupts you mid-sentence for the third time in the same conversation.' },
    core:    { definition: 'A strong feeling of displeasure or hostility, often triggered by a perceived wrong or injustice.', example: 'You might feel Anger when someone breaks a promise that genuinely mattered to you.' },
    intense: { example: 'You might feel Rage finding out that someone you trusted deliberately betrayed you for their own benefit.' },
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  emotion:            CoreEmotion;
  isSelected:         boolean;
  distanceFromCenter: number;
  onSelect:           (emotion: CoreEmotion, tier: EmotionTier) => void;
  onInfo:             (emotion: CoreEmotion, tier: EmotionTier) => void;
}

export default function WheelItem({
  emotion, isSelected, distanceFromCenter, onSelect, onInfo,
}: Props) {
      const { colors } = useTheme();

    const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );

  const emotionColor = EMOTION_COLORS[emotion];
  const derivatives  = DERIVATIVE_NAMES[emotion];
  const isCentered   = distanceFromCenter === 0;

  // Curve effect — scale and fade based on distance from center
  const scale   = Math.max(0.70, 1 - distanceFromCenter * 0.13);
  const opacity = isCentered ? 1 : Math.max(0.18, 1 - distanceFromCenter * 0.32);

  return (
    <View style={styles.container}>
      <View style={[styles.row, { transform: [{ scale }], opacity }]}>

        {/* Mild */}
        <TouchableOpacity
          style={[
            styles.sideChip,
            { borderColor: isCentered ? emotionColor : colors.border },
          ]}
          onPress={() => onSelect(emotion, 'mild')}
          onLongPress={() => onInfo(emotion, 'mild')}
          activeOpacity={0.7}
          disabled={!isCentered}
        >
          <Text style={[styles.tierLabel, { color: isCentered ? emotionColor : colors.textMuted }]}>
            mild
          </Text>
          <Text
            style={[styles.tierName, { color: isCentered ? emotionColor : colors.textMuted }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {derivatives.mild}
          </Text>
        </TouchableOpacity>

        {/* Core */}
        <TouchableOpacity
          style={[
            styles.coreChip,
            { backgroundColor: isCentered ? emotionColor : colors.cardAlt },
            isSelected && isCentered && styles.coreSelected,
          ]}
          onPress={() => onSelect(emotion, 'core')}
          onLongPress={() => onInfo(emotion, 'core')}
          activeOpacity={0.8}
          disabled={!isCentered}
        >
          <Text style={[
            styles.coreName,
            { color: isCentered ? colors.textDark : colors.textMuted },
          ]}>
            {emotion}
          </Text>
          {isCentered && (
            <Text style={styles.coreHint}>hold for info</Text>
          )}
        </TouchableOpacity>

        {/* Intense */}
        <TouchableOpacity
          style={[
            styles.sideChip,
            { borderColor: isCentered ? emotionColor : colors.border },
          ]}
          onPress={() => onSelect(emotion, 'intense')}
          onLongPress={() => onInfo(emotion, 'intense')}
          activeOpacity={0.7}
          disabled={!isCentered}
        >
          <Text style={[styles.tierLabel, { color: isCentered ? emotionColor : colors.textMuted }]}>
            intense
          </Text>
          <Text
            style={[styles.tierName, { color: isCentered ? emotionColor : colors.textMuted }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {derivatives.intense}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

export const ITEM_HEIGHT = 140;

const createStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    height:         ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems:     'center',
    width:          '100%',
  },
  row: {
    flexDirection:     'row',
    alignItems:        'stretch',
    gap:               spacing.sm,
    paddingHorizontal: spacing.lg,
    width:             '100%',
    height:            ITEM_HEIGHT - 16,
  },
  sideChip: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius:      radius.md,
    borderWidth:       1.5,
    backgroundColor:   colors.card,
    gap:               4,
  },
  tierLabel: {
    fontSize:      fontSize.xs,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tierName: {
    fontSize:   fontSize.sm,
    fontWeight: '700',
    textAlign:  'center',
  },
  coreChip: {
    flex:           1.3,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   radius.md,
    gap:            4,
  },
  coreSelected: {
    shadowColor:   '#ffffff',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius:  10,
    elevation:     10,
  },
  coreName: {
    fontSize:   fontSize.lg,
    fontWeight: '800',
  },
  coreHint: {
    color:    'rgba(0,0,0,0.4)',
    fontSize: fontSize.xs,
  },
});