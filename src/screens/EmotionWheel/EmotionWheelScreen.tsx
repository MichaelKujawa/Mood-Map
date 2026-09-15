import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Modal, ViewToken, BackHandler, Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive, moderateScale } from '../../theme/responsive';
import { CORE_EMOTIONS } from '../../core/emotionRegistry';
import type { CoreEmotion, EmotionTier } from '../../core/types';
import WheelItem, {
  EMOTION_COLORS,
  DERIVATIVE_NAMES,
  EMOTION_INFO,
} from './WheelItem';

// ── Looped data for infinite scroll feel ─────────────────────────────────────
const REPEAT_COUNT  = 20;
const BASE_EMOTIONS = CORE_EMOTIONS as unknown as CoreEmotion[];
const LOOPED_DATA   = Array.from({ length: REPEAT_COUNT }, () => BASE_EMOTIONS).flat();
const START_INDEX   = Math.floor(REPEAT_COUNT / 2) * BASE_EMOTIONS.length;

// LOOPED_DATA is a large but genuinely FINITE array, not truly infinite —
// it just has enough repetitions that reaching either real edge is rare
// during normal use. If a user DOES scroll far enough to approach an edge,
// the viewability tracking that determines "which item is centered"
// becomes unreliable there (there's no more content to fill out the
// buffer), which is what caused rows near the edge to render grey/
// unselectable rather than one of them becoming the centered item.
// BOUNDARY_THRESHOLD is how many rows of buffer are left before that
// point at which we silently reposition back to the equivalent emotion
// in the middle repetition — since every repetition is visually
// identical, the jump is invisible, and scrolling continues to feel
// infinite in both directions instead of hitting a real dead end.
const BOUNDARY_THRESHOLD = BASE_EMOTIONS.length * 3;

// Target row height — used both as the fallback before the wheel wrapper
// has been measured, AND as an upper bound on itemHeight once it has been.
// Without a cap, itemHeight was simply "all available height / 3", which
// on a screen with generous vertical room (now common, since confirmArea
// is a small fixed size) produced rows much taller than a chip's own
// content could fill even at the raised font-size ceilings — leaving a
// visible gap between the chip and the edge of its row. Capping itemHeight
// means any genuinely extra space shows up as margin around the WHOLE
// 3-row wheel (wheelWrapper already centers it) instead of as dead space
// inside each individual row. Modestly scaled per device (moderateScale
// factor 0.4) so tablet still gets a bit more room than phone.
const TARGET_ITEM_HEIGHT = 110;

export interface SelectedEmotion {
  coreEmotion: CoreEmotion;
  tier:        EmotionTier;
  derivative:  string;
}

interface InfoTarget {
  emotion: CoreEmotion;
  tier:    EmotionTier;
}

interface Props {
  onEmotionConfirmed: (emotion: SelectedEmotion) => void;
  onDone:             () => void;
  onClose:            () => void;
  selectedCount:      number;
}

/**
 * Wheel-row geometry. itemHeight is derived from the *actual measured*
 * available space (the wheel wrapper's real rendered height) instead of a
 * guessed "45% of screen" fraction — that fraction was tuned for phones and
 * deliberately left over half the screen for the confirm area, which is
 * exactly why the confirm area looked like an oversized separate panel on
 * a tall tablet screen. The wheel wrapper is now the only flex:1 element
 * in the column, so it naturally consumes whatever's left after the
 * header/instruction/confirm text take their natural sizes — but itemHeight
 * itself is now capped at targetItemHeight (see TARGET_ITEM_HEIGHT) rather
 * than simply being "whatever's left / 3", so a very tall screen doesn't
 * produce rows far bigger than a chip can actually fill.
 *
 * visibleItems is a fixed 3, always — deliberately not derived from
 * available space. Scrolling is already effectively infinite (see
 * BOUNDARY_THRESHOLD above), so showing more rows doesn't help anyone
 * pick faster; it just adds visual noise around the one row that matters.
 *
 * IMPORTANT: wheelHeight must always equal itemHeight * visibleItems
 * exactly. The center band, the fade overlays, and the FlatList's own
 * contentInset/contentOffset math all assume that relationship holds.
 * Deriving itemHeight by flooring (availableHeight / visibleItems) and then
 * multiplying back out preserves that exactly, with at most a few px of
 * unused space absorbed by wheelWrapper's centering rather than breaking
 * the invariant.
 *
 * @param availableHeight - measured height of the wheel wrapper, via
 *   onLayout. 0 before the first layout pass has happened.
 */
function useWheelGeometry(availableHeight: number) {
  const { scaleFactor } = useResponsive();

  const visibleItems = 3;

  const targetItemHeight = Math.round(moderateScale(TARGET_ITEM_HEIGHT, scaleFactor, 0.4));

  // Whichever is smaller: the target (so rows don't grow past a sensible
  // size), or what actually fits (so 3 rows never overflow a genuinely
  // short wheelWrapper, e.g. phone landscape).
  const itemHeight = availableHeight > 0
    ? Math.max(1, Math.min(targetItemHeight, Math.floor(availableHeight / visibleItems)))
    : targetItemHeight;

  const wheelHeight  = itemHeight * visibleItems;
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  return { itemHeight, visibleItems, wheelHeight, centerOffset };
}

export default function EmotionWheelScreen({
  onEmotionConfirmed, onDone, onClose, selectedCount,
}: Props) {
  const [centeredIndex, setCenteredIndex]     = useState(START_INDEX);
  const [selectedEmotion, setSelectedEmotion] = useState<SelectedEmotion | null>(null);
  const [infoTarget, setInfoTarget]           = useState<InfoTarget | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);

  // Mirrors centeredIndex without being a dependency of the recenter effect
  // below — updated every render so the effect always reads the user's
  // latest actual position, without re-firing on every scroll tick the way
  // adding centeredIndex to that effect's dependency array would.
  const centeredIndexRef = useRef(centeredIndex);
  centeredIndexRef.current = centeredIndex;

  const { colors, spacing, fontSize, radius } = useTheme();
  const { scaleFactor } = useResponsive();

  // The wheel wrapper is the only flex:1 element in the column now, so its
  // rendered height IS the real available space for the wheel — measured
  // live rather than assumed, same pattern used elsewhere (itemHeight used
  // to assume a 45%-of-screen fraction; now it's derived from this).
  //
  // Deliberately NOT reset to 0 on orientation flip (unlike similar
  // measurements elsewhere in the app). Resetting caused useWheelGeometry
  // to briefly fall back to targetItemHeight — a formula sized for
  // portrait's generous vertical budget — while waiting for the real
  // landscape measurement to arrive. Landscape has far less height to
  // work with, so that fallback rendered a wheelContainer taller than its
  // actual box for a frame, spilling out of wheelWrapper. Keeping the
  // stale prior-orientation value during that same brief window is a much
  // closer approximation than the fallback formula, and wheelWrapper's
  // overflow:hidden clips any remaining mismatch either way.
  const [wheelWrapperHeight, setWheelWrapperHeight] = useState(0);
  const [wheelWrapperWidth,  setWheelWrapperWidth]  = useState(0);

  function onWheelWrapperLayout(e: LayoutChangeEvent) {
    setWheelWrapperHeight(e.nativeEvent.layout.height);
    setWheelWrapperWidth(e.nativeEvent.layout.width);
  }

  const { itemHeight, wheelHeight, centerOffset } = useWheelGeometry(wheelWrapperHeight);

  // Mirror itemHeight/centerOffset into refs, same reasoning as
  // centeredIndexRef above — onViewableItemsChanged below deliberately
  // keeps a stable [] dependency array (React Native's own guidance:
  // changing onViewableItemsChanged's identity on the fly isn't reliably
  // supported), but it still needs the CURRENT geometry when it triggers
  // a boundary reposition, not whatever geometry existed when the
  // callback was first created.
  const itemHeightRef = useRef(itemHeight);
  itemHeightRef.current = itemHeight;
  const centerOffsetRef = useRef(centerOffset);
  centerOffsetRef.current = centerOffset;

  // Inner content width available inside each chip, derived from the
  // measured row width and the row's own layout constants (paddingHorizontal
  // spacing.lg, gap spacing.sm between 3 children, chip flex ratios
  // 1 / 1.3 / 1, chip paddingHorizontal 3 each). Passed to WheelItem so
  // every emotion's label can be sized off the SAME worst-case fit instead
  // of each auto-shrinking independently to its own optimal size — which
  // is what made short words ("Joy") render visibly bigger than long ones
  // ("Apprehension"). 0 before the wrapper has been measured.
  const { sideChipInnerWidth, coreChipInnerWidth } = useMemo(() => {
    if (wheelWrapperWidth === 0) return { sideChipInnerWidth: 0, coreChipInnerWidth: 0 };

    const rowGaps       = spacing.sm * 2;   // two gaps between three chips
    const rowPadding    = spacing.lg * 2;   // row's own paddingHorizontal
    const innerRowWidth = wheelWrapperWidth - rowGaps - rowPadding;

    const totalFlexUnits = 1 + 1.3 + 1;     // sideChip / coreChip / sideChip
    const sideChipWidth  = innerRowWidth * (1   / totalFlexUnits);
    const coreChipWidth  = innerRowWidth * (1.3 / totalFlexUnits);

    const chipPadding = 3 * 2; // literal 3px on each side, both chip types

    return {
      sideChipInnerWidth: Math.max(0, sideChipWidth - chipPadding),
      coreChipInnerWidth: Math.max(0, coreChipWidth - chipPadding),
    };
  }, [wheelWrapperWidth, spacing.sm, spacing.lg]);

  // FlatList's contentOffset prop is meant purely as an *initial* scroll
  // position — but it's declarative, and React Native re-applies it
  // whenever its value changes, not just on mount. Computing it from a
  // live itemHeight meant it was silently being recomputed (and
  // re-applied) every time itemHeight changed for ANY reason — the
  // fallback→measured settling on mount, or confirmArea growing taller
  // once a selection is first made and shrinking the wheel's available
  // space — which is what caused the wheel to snap back to START_INDEX
  // ("Joy") after a selection. Frozen here with an empty dependency array
  // so it's captured once, using whatever itemHeight/centerOffset exist
  // on the very first render, and never recomputed again. The recenter
  // effect below (which targets the user's actual current position, not
  // START_INDEX) is what handles every correction after that first paint.
  const initialContentOffset = useMemo(
    () => ({ x: 0, y: START_INDEX * itemHeight - centerOffset }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // empty: this must capture once and never recompute, see comment above.
    [],
  );

  const styles = useMemo(
          () => createStyles(colors, spacing, fontSize, radius, centerOffset, scaleFactor),
          [colors, spacing, fontSize, radius, centerOffset, scaleFactor]
      );

  // Re-center whenever the row height changes (e.g. rotation, or the
  // fallback→measured settling on mount) so the FlatList's pixel offset
  // stays correct for the new itemHeight. Targets centeredIndexRef (the
  // user's actual current position) rather than the fixed START_INDEX —
  // the previous version reset to START_INDEX unconditionally, which is
  // exactly what caused the wheel to visually snap back to whatever
  // emotion sits at that index if the user had already scrolled/selected
  // by the time itemHeight settled from its initial fallback to the real
  // measured value. On a normal mount, centeredIndexRef.current is still
  // START_INDEX (nothing's moved yet), so this is a no-op behavior change
  // for that case — it only differs once the user has actually scrolled.
  //
  // Uses scrollToOffset with the same (index * itemHeight - centerOffset)
  // formula as initialContentOffset above, rather than scrollToIndex.
  // scrollToIndex aligns its target to the TOP of the viewport by default,
  // which ignores our centerOffset entirely — that mismatch is exactly
  // centerOffset worth of pixels (one row on phone), which is the "off by
  // one row" shift. scrollToOffset takes a raw pixel offset directly, so
  // it can't drift out of sync with how the list is actually centered.
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset:   centeredIndexRef.current * itemHeight - centerOffset,
        animated: false,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [itemHeight]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      // The centered item is the middle of the visible items
      const mid = Math.floor(viewableItems.length / 2);
      const centered = viewableItems[mid];
      if (centered?.index === undefined || centered.index === null) return;

      const index = centered.index;

      // Close enough to either real edge of LOOPED_DATA that viewability
      // tracking would soon become unreliable (see BOUNDARY_THRESHOLD
      // comment above) — silently jump to the same emotion in the middle
      // repetition instead of letting the user actually reach the edge.
      if (index < BOUNDARY_THRESHOLD || index > LOOPED_DATA.length - 1 - BOUNDARY_THRESHOLD) {
        const repositioned = START_INDEX + (index % BASE_EMOTIONS.length);

        // Update the ref immediately, not just the state — if an
        // itemHeight-driven correction (the recenter effect) fires
        // before the next render has synced centeredIndexRef from state,
        // it must already see the repositioned value, not the stale
        // near-boundary one.
        centeredIndexRef.current = repositioned;
        setCenteredIndex(repositioned);

        flatListRef.current?.scrollToOffset({
          offset:   repositioned * itemHeightRef.current - centerOffsetRef.current,
          animated: false,
        });
        return;
      }

      setCenteredIndex(index);
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  function handleSelect(emotion: CoreEmotion, tier: EmotionTier) {
    setSelectedEmotion({
      coreEmotion: emotion,
      tier,
      derivative:  DERIVATIVE_NAMES[emotion][tier],
    });
  }

  function handleConfirm() {
    if (!selectedEmotion) return;
    onEmotionConfirmed(selectedEmotion);
    setSelectedEmotion(null);
  }

  // ── Hardware back button (Android) ──────────────────────────────────────
  // While this screen is mounted, back should close the info modal first if
  // it's open, then clear a pending emotion selection/confirmation, and only
  // then fall through to onClose (which App.tsx wires to the discard-entry
  // confirmation). This mirrors the priority a user would expect from the
  // on-screen ✕ buttons already in this screen.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (infoTarget !== null) {
        setInfoTarget(null);
        return true;
      }
      if (selectedEmotion !== null) {
        setSelectedEmotion(null);
        return true;
      }
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [infoTarget, selectedEmotion, onClose]);

  const currentEmotion = LOOPED_DATA[centeredIndex] ?? BASE_EMOTIONS[0];
  const emotionColor   = EMOTION_COLORS[currentEmotion];

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How did you feel?</Text>
        {selectedCount > 0
          ? (
            <TouchableOpacity onPress={onDone} style={styles.doneButton}>
              <Text style={styles.doneText}>Done ({selectedCount})</Text>
            </TouchableOpacity>
          )
          : <View style={{ width: 90 }} />
        }
      </View>

      {/* Body — instruction/accent are natural-sized; the wheel wrapper is
          the only flex:1 element here, so it consumes all leftover space
          below the header instead of splitting it with the confirm area. */}
      <View style={styles.body}>

        <Text style={styles.instruction}>
          Scroll to an emotion  •  Tap mild, core, or intense
        </Text>

        {/* Accent bar — color updates as you scroll */}
        <View style={[styles.accentBar, { backgroundColor: emotionColor }]} />

        {/* Wheel wrapper — flex:1, measured live to derive itemHeight */}
        <View style={styles.wheelWrapper} onLayout={onWheelWrapperLayout}>
          <View style={[styles.wheelContainer, { height: wheelHeight }]}>

            {/* Center highlight band — sits behind the list */}
            <View style={[styles.centerBand, { top: centerOffset, height: itemHeight }]} pointerEvents="none" />

            <FlatList
              ref={flatListRef}
              data={LOOPED_DATA}
              keyExtractor={(_, index) => String(index)}
              renderItem={({ item, index }) => (
                <WheelItem
                  emotion={item}
                  isSelected={selectedEmotion?.coreEmotion === item}
                  distanceFromCenter={Math.abs(index - centeredIndex)}
                  onSelect={handleSelect}
                  onInfo={(emotion, tier) => setInfoTarget({ emotion, tier })}
                  itemHeight={itemHeight}
                  sideChipInnerWidth={sideChipInnerWidth}
                  coreChipInnerWidth={coreChipInnerWidth}
                />
              )}
              // Snap exactly to item boundaries
              snapToInterval={itemHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: itemHeight,
                offset: itemHeight * index,
                index,
              })}
              // Padding pushes first/last items into center position
              contentInset={{ top: centerOffset, bottom: centerOffset }}
              contentOffset={initialContentOffset}
            />

            {/* Fade overlays */}
            <View style={styles.fadeTop}    pointerEvents="none" />
            <View style={styles.fadeBottom} pointerEvents="none" />
          </View>
        </View>

        {/* Confirmation — natural height now, tucked right under the wheel
            instead of stretching to fill leftover screen space. */}
        <View style={styles.confirmArea}>
          {selectedEmotion ? (
            <>
              <Text style={styles.confirmText}>
                You felt{' '}
                <Text style={[
                  styles.confirmEmphasis,
                  { color: EMOTION_COLORS[selectedEmotion.coreEmotion] },
                ]}>
                  {DERIVATIVE_NAMES[selectedEmotion.coreEmotion][selectedEmotion.tier]}
                </Text>
                {' '}today — is that correct?
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#E74C3C' }]}
                  onPress={() => setSelectedEmotion(null)}
                >
                  <Text style={styles.confirmBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#2ECC71' }]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.confirmPlaceholder}>
              Select an emotion above to continue
            </Text>
          )}
        </View>

      </View>

      {/* Info modal */}
      <Modal
        visible={infoTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoTarget(null)}
        >
          {infoTarget && (() => {
            const info = EMOTION_INFO[infoTarget.emotion][infoTarget.tier];
            const name = DERIVATIVE_NAMES[infoTarget.emotion][infoTarget.tier];
            const color = EMOTION_COLORS[infoTarget.emotion];
            return (
              <View style={[styles.infoCard, { borderColor: color }]}>
                <View style={styles.infoHeader}>
                  <Text style={[styles.infoTitle, { color }]}>{name}</Text>
                  <Text style={styles.infoTierLabel}>
                    {infoTarget.tier} · {infoTarget.emotion}
                  </Text>
                </View>
                {info.definition && (
                  <Text style={styles.infoDefinition}>{info.definition}</Text>
                )}
                <View style={styles.infoDivider} />
                <Text style={styles.infoExampleLabel}>EXAMPLE</Text>
                <Text style={styles.infoExample}>{info.example}</Text>
                <Text style={styles.infoDismiss}>Tap anywhere to close</Text>
              </View>
            );
          })()}
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any, spacing: any, fontSize: any, radius: any, centerOffset: number, scaleFactor: number) => {
  // confirmArea's rendered content genuinely differs in height between its
  // two states — a one-line placeholder vs. confirm text (up to 2 lines)
  // plus a row of two 64dp buttons. A minHeight only sets a floor, so
  // switching between states still resized confirmArea, which shrank
  // wheelWrapper, which changed itemHeight, which is what caused the wheel
  // to visibly jump/resize on first selection. Reserving a FIXED height —
  // sized for the larger (selected) state — up front means selecting an
  // emotion never changes confirmArea's footprint at all, so wheelWrapper
  // (and therefore itemHeight and every chip's font size) stays perfectly
  // stable across the interaction instead of needing to be corrected
  // after the fact.
  const CONFIRM_TEXT_LINE_HEIGHT = 24; // matches confirmText.lineHeight below
  const CONFIRM_TEXT_MAX_LINES   = 2;  // "You felt X today — is that correct?" can wrap on a narrow phone
  const CONFIRM_BUTTON_SIZE      = 64; // matches confirmBtn width/height below

  const confirmAreaHeight =
    spacing.lg * 2 +                                   // paddingVertical, top + bottom
    (CONFIRM_TEXT_LINE_HEIGHT * CONFIRM_TEXT_MAX_LINES) + // confirm text, worst case 2 lines
    spacing.lg +                                        // confirmText's marginBottom
    CONFIRM_BUTTON_SIZE;                                 // the buttons row

  return StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
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
    fontSize:   moderateScale(fontSize.md, scaleFactor),
    fontWeight: '700',
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   moderateScale(fontSize.lg, scaleFactor),
    fontWeight: '700',
  },
  doneButton: {
    width:      90,
    alignItems: 'flex-end',
  },
  doneText: {
    color:      colors.purpleLight,
    fontSize:   moderateScale(fontSize.sm, scaleFactor),
    fontWeight: '700',
  },
  // The only flex:1 element in this column is wheelWrapper — instruction,
  // accentBar, and confirmArea all take their natural content height, so
  // the wheel is what grows to consume whatever's left, rather than
  // splitting the leftover space with a stretched confirm area.
  body: {
    flex: 1,
  },
  instruction: {
    color:        colors.textMuted,
    fontSize:     moderateScale(fontSize.sm, scaleFactor),
    textAlign:    'center',
    marginBottom: spacing.sm,
  },
  accentBar: {
    height:           3,
    marginHorizontal: spacing.lg,
    borderRadius:     radius.full,
    marginBottom:     spacing.sm,
    opacity:          0.85,
  },
  wheelWrapper: {
    flex:           1,
    justifyContent: 'center',
    // Defensive: if wheelContainer is ever transiently taller than this
    // wrapper's real box (e.g. mid-rotation, before the new measurement
    // lands), clip it here rather than letting it spill onto the
    // instruction text above or the confirm area below.
    overflow:       'hidden',
  },
  wheelContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  centerBand: {
    position:          'absolute',
    left:              0,
    right:             0,
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
    zIndex:            1,
  },
  fadeTop: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          centerOffset * 0.9,
    backgroundColor: colors.background,
    opacity:         0.82,
    zIndex:          2,
  },
  fadeBottom: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          centerOffset * 0.9,
    backgroundColor: colors.background,
    opacity:         0.82,
    zIndex:          2,
  },
  confirmArea: {
    // Fixed height (see confirmAreaHeight above) rather than minHeight —
    // sized to fit the larger (selected) state, so switching between
    // placeholder and selected content never resizes confirmArea itself.
    height:            confirmAreaHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.lg,
    alignItems:        'center',
    justifyContent:    'center',
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
  confirmText: {
    color:        colors.white,
    fontSize:     moderateScale(fontSize.md, scaleFactor),
    textAlign:    'center',
    marginBottom: spacing.lg,
    lineHeight:   24,
  },
  confirmEmphasis: {
    fontWeight: '800',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap:           spacing.xl,
  },
  confirmBtn: {
    width:          64,
    height:         64,
    borderRadius:   radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color:      colors.white,
    fontSize:   moderateScale(fontSize.xl, scaleFactor),
    fontWeight: '700',
  },
  confirmPlaceholder: {
    color:    colors.textMuted,
    fontSize: moderateScale(fontSize.sm, scaleFactor),
  },
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    width:           '100%',
    maxWidth:        480,
    borderWidth:     2,
    gap:             spacing.sm,
  },
  infoHeader: {
    marginBottom: spacing.xs,
  },
  infoTitle: {
    fontSize:   moderateScale(fontSize.xl, scaleFactor),
    fontWeight: '800',
  },
  infoTierLabel: {
    color:         colors.textMuted,
    fontSize:      moderateScale(fontSize.xs, scaleFactor),
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:     spacing.xs,
  },
  infoDefinition: {
    color:      colors.white,
    fontSize:   moderateScale(fontSize.md, scaleFactor),
    lineHeight: 24,
  },
  infoDivider: {
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.sm,
  },
  infoExampleLabel: {
    color:         colors.textMuted,
    fontSize:      moderateScale(fontSize.xs, scaleFactor),
    fontWeight:    '600',
    letterSpacing: 0.5,
  },
  infoExample: {
    color:      colors.white,
    fontSize:   moderateScale(fontSize.sm, scaleFactor),
    lineHeight: 22,
    fontStyle:  'italic',
  },
  infoDismiss: {
    color:     colors.textMuted,
    fontSize:  moderateScale(fontSize.xs, scaleFactor),
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
};