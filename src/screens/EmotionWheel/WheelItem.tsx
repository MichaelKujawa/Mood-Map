import React, {useMemo} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive } from '../../theme/responsive';
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Every label in a given category (tier derivatives, core names) shares one
// computed font size rather than each auto-shrinking to its own best fit —
// that per-word shrinking is what made "Joy" render visibly bigger than
// "Apprehension". Sizing off the single longest possible string in each
// category guarantees every other, shorter string in that category fits
// too, at the exact same size.
const ALL_TIER_NAMES = Object.values(DERIVATIVE_NAMES).flatMap(d => [d.mild, d.intense]);
const LONGEST_TIER_NAME = ALL_TIER_NAMES.reduce((a, b) => (b.length > a.length ? b : a));

const ALL_CORE_NAMES = Object.keys(DERIVATIVE_NAMES);
const LONGEST_CORE_NAME = ALL_CORE_NAMES.reduce((a, b) => (b.length > a.length ? b : a));

// Rough average glyph width as a fraction of font size, for a bold
// sans-serif system font. Not pixel-perfect across every platform/font —
// which is exactly why adjustsFontSizeToFit is kept on as a defensive
// fallback below, rather than relied on as the primary sizing mechanism.
const AVG_CHAR_WIDTH_RATIO = 0.58;

/** Largest font size at which `text` fits within `availableWidth`, per the
 *  heuristic above. Returns Infinity if availableWidth hasn't been
 *  measured yet (0), so callers gracefully fall back to their other
 *  (height-based) constraint until the real width arrives. */
function fontSizeToFitWidth(text: string, availableWidth: number): number {
  if (availableWidth <= 0) return Infinity;
  return availableWidth / (text.length * AVG_CHAR_WIDTH_RATIO);
}

interface Props {
  emotion:            CoreEmotion;
  isSelected:         boolean;
  distanceFromCenter: number;
  onSelect:           (emotion: CoreEmotion, tier: EmotionTier) => void;
  onInfo:             (emotion: CoreEmotion, tier: EmotionTier) => void;
  /**
   * Row height in dp, computed once by EmotionWheelScreen via
   * useWheelGeometry() and passed down. Every item in the list must agree
   * on the same height, so it's computed in one place, not per-row.
   */
  itemHeight: number;
  /**
   * Inner content width of a side chip / the core chip, measured once by
   * EmotionWheelScreen and shared across every row — see the comment above
   * LONGEST_TIER_NAME for why this matters for sizing. 0 before
   * EmotionWheelScreen has measured the wheel's real width.
   */
  sideChipInnerWidth: number;
  coreChipInnerWidth: number;
}

export default function WheelItem({
  emotion, isSelected, distanceFromCenter, onSelect, onInfo, itemHeight,
  sideChipInnerWidth, coreChipInnerWidth,
}: Props) {
      const { colors, spacing, fontSize, radius } = useTheme();
      const { scaleFactor } = useResponsive();

    const styles = useMemo(
        () => createStyles(colors, spacing, fontSize, radius, itemHeight, scaleFactor, sideChipInnerWidth, coreChipInnerWidth),
        [colors, spacing, fontSize, radius, itemHeight, scaleFactor, sideChipInnerWidth, coreChipInnerWidth]
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
          <Text
            style={[styles.tierLabel, { color: isCentered ? emotionColor : colors.textMuted }]}
            numberOfLines={1}
          >
            mild
          </Text>
          <Text
            style={[styles.tierName, { color: isCentered ? emotionColor : colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
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
          <Text
            style={[
              styles.coreName,
              { color: isCentered ? colors.textDark : colors.textMuted },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
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
          <Text
            style={[styles.tierLabel, { color: isCentered ? emotionColor : colors.textMuted }]}
            numberOfLines={1}
          >
            intense
          </Text>
          <Text
            style={[styles.tierName, { color: isCentered ? emotionColor : colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {derivatives.intense}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (
  colors: any, spacing: any, fontSize: any, radius: any,
  itemHeight: number, scaleFactor: number,
  sideChipInnerWidth: number, coreChipInnerWidth: number,
) => {
  // Text sizes derived from the chip's own itemHeight (already live-measured
  // by useWheelGeometry in EmotionWheelScreen) instead of the shared theme
  // fontSize scale. Same reasoning as the HomeScreen nav cards: itemHeight
  // already resizes correctly for tablet, but the theme's fontSize scale
  // is deliberately dampened for phone→tablet reading screens and doesn't
  // track a box that's genuinely much bigger. lineHeight is derived
  // alongside each size rather than left fixed or default — a lineHeight
  // that doesn't track the font size clips glyphs or cramps wrapped lines.
  //
  // tierNameSize/coreNameSize additionally take the MIN against
  // fontSizeToFitWidth(LONGEST_..., innerWidth) — the height-based desired
  // size on its own doesn't know anything about how long a word needs to
  // fit into the (much narrower) chip width, and each Text auto-shrinking
  // independently is what caused different-length words to render at
  // different sizes. Taking the min against the SAME worst-case-word
  // target for every row means every row picks the same final size.
  //
  // Upper bounds here are generous headroom, not a target to reliably
  // reach — itemHeight is capped at a reasonable size now (see
  // TARGET_ITEM_HEIGHT in EmotionWheelScreen), and chip WIDTH is what
  // actually binds these sizes in most real cases (a phone's narrow side
  // chips hit fontSizeToFitWidth well before this height-based ceiling).
  // The ceilings mainly exist so a tablet's wider chips, which have more
  // width headroom, aren't needlessly held back by an overly tight
  // height-based number.
  const tierLabelSize = Math.round(clamp(itemHeight * 0.09, 9, 24));
  const coreHintSize  = Math.round(clamp(itemHeight * 0.085, 9, 20));

  const tierNameHeightDesired = clamp(itemHeight * 0.15, 12, 40);
  const tierNameWidthMax      = fontSizeToFitWidth(LONGEST_TIER_NAME, sideChipInnerWidth);
  const tierNameSize          = Math.round(clamp(Math.min(tierNameHeightDesired, tierNameWidthMax), 10, 40));

  const coreNameHeightDesired = clamp(itemHeight * 0.24, 16, 64);
  const coreNameWidthMax      = fontSizeToFitWidth(LONGEST_CORE_NAME, coreChipInnerWidth);
  const coreNameSize          = Math.round(clamp(Math.min(coreNameHeightDesired, coreNameWidthMax), 14, 64));

  const tierLabelLineHeight = Math.round(tierLabelSize * 1.3);
  const tierNameLineHeight  = Math.round(tierNameSize  * 1.25);
  const coreNameLineHeight  = Math.round(coreNameSize  * 1.15);
  const coreHintLineHeight  = Math.round(coreHintSize  * 1.3);

  // Scales with itemHeight for the same reason the font sizes above do —
  // a chip with much bigger text needs proportionally more breathing room
  // around it, not the same small fixed padding regardless of row size.
  // Now that itemHeight itself is capped at a reasonable target (see
  // TARGET_ITEM_HEIGHT in EmotionWheelScreen) rather than potentially
  // growing very large, padding can afford to be a bigger fraction of it —
  // padding is a safe, width-independent way to help the chip fill more
  // of its row, unlike font size, which is already close to its practical
  // ceiling on a phone (bounded by chip width, not itemHeight).
  const chipPaddingVertical = Math.round(clamp(itemHeight * 0.22, spacing.sm, 40));

  return StyleSheet.create({
  container: {
    height:         itemHeight,
    justifyContent: 'center',
    alignItems:     'center',
    width:          '100%',
  },
  row: {
    flexDirection:     'row',
    // Was 'stretch' — chips filled the entire (often now much taller,
    // since itemHeight can fill most of the screen) row height, leaving
    // the now-smaller, uniformly-sized text stranded in a tall rectangle
    // with a lot of dead space above and below it. 'center' lets each
    // chip size to its own content instead, so the chip itself looks
    // properly proportioned, with any leftover row height appearing as
    // neutral space around the chip rather than as padding inside it.
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.lg,
    width:             '100%',
  },
  sideChip: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   chipPaddingVertical,
    // A literal 3px rather than a themed spacing value — the auto-shrink
    // font sizing above is already fitting text tightly to the available
    // width, so this needs to be a small precise gutter, not a themed
    // spacing step that would eat into that width unpredictably.
    paddingHorizontal: 3,
    borderRadius:      radius.md,
    borderWidth:       1.5,
    backgroundColor:   colors.card,
    gap:               4,
  },
  tierLabel: {
    fontSize:      tierLabelSize,
    lineHeight:    tierLabelLineHeight,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tierName: {
    fontSize:   tierNameSize,
    lineHeight: tierNameLineHeight,
    fontWeight: '700',
    textAlign:  'center',
  },
  coreChip: {
    flex:              1.3,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   chipPaddingVertical,
    paddingHorizontal: 3,
    borderRadius:      radius.md,
    gap:               4,
  },
  coreSelected: {
    shadowColor:   '#ffffff',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius:  10,
    elevation:     10,
  },
  coreName: {
    fontSize:   coreNameSize,
    lineHeight: coreNameLineHeight,
    fontWeight: '800',
  },
  coreHint: {
    color:      'rgba(0,0,0,0.4)',
    fontSize:   coreHintSize,
    lineHeight: coreHintLineHeight,
  },
  });
};