import React, { useState, useRef, useCallback, useEffect, useMemo} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, SafeAreaView, Modal, ViewToken,
} from 'react-native';
import { spacing, fontSize, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import { CORE_EMOTIONS } from '../../core/emotionRegistry';
import type { CoreEmotion, EmotionTier } from '../../core/types';
import WheelItem, {
  EMOTION_COLORS,
  DERIVATIVE_NAMES,
  EMOTION_INFO,
  ITEM_HEIGHT,
} from './WheelItem';

const { height, width } = Dimensions.get('window');

// ── Looped data for infinite scroll feel ─────────────────────────────────────
const REPEAT_COUNT  = 20;
const BASE_EMOTIONS = CORE_EMOTIONS as unknown as CoreEmotion[];
const LOOPED_DATA   = Array.from({ length: REPEAT_COUNT }, () => BASE_EMOTIONS).flat();
const START_INDEX   = Math.floor(REPEAT_COUNT / 2) * BASE_EMOTIONS.length;

// How many items are visible above and below center
// This controls how much of the list is visible at once
const VISIBLE_ITEMS   = 3;
const WHEEL_HEIGHT    = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_OFFSET   = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

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

export default function EmotionWheelScreen({
  onEmotionConfirmed, onDone, onClose, selectedCount,
}: Props) {
    const { colors } = useTheme();

    const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [centeredIndex, setCenteredIndex]     = useState(START_INDEX);
  const [selectedEmotion, setSelectedEmotion] = useState<SelectedEmotion | null>(null);
  const [infoTarget, setInfoTarget]           = useState<InfoTarget | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);

  // Scroll to start position once mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index:    START_INDEX,
        animated: false,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      // The centered item is the middle of the visible items
      const mid = Math.floor(viewableItems.length / 2);
      const centered = viewableItems[mid];
      if (centered?.index !== undefined && centered.index !== null) {
        setCenteredIndex(centered.index);
      }
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

      <Text style={styles.instruction}>
        Scroll to an emotion  •  Tap mild, core, or intense
      </Text>

      {/* Accent bar — color updates as you scroll */}
      <View style={[styles.accentBar, { backgroundColor: emotionColor }]} />

      {/* Wheel container — fixed height so center band is always in same spot */}
      <View style={[styles.wheelContainer, { height: WHEEL_HEIGHT }]}>

        {/* Center highlight band — sits behind the list */}
        <View style={[styles.centerBand, { top: CENTER_OFFSET }]} pointerEvents="none" />

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
            />
          )}
          // Snap exactly to item boundaries
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          // Padding pushes first/last items into center position
          contentInset={{ top: CENTER_OFFSET, bottom: CENTER_OFFSET }}
          contentOffset={{ x: 0, y: START_INDEX * ITEM_HEIGHT - CENTER_OFFSET }}
        />

        {/* Fade overlays */}
        <View style={styles.fadeTop}    pointerEvents="none" />
        <View style={styles.fadeBottom} pointerEvents="none" />
      </View>

      {/* Confirmation */}
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

const createStyles = (colors: any) => 
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
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   fontSize.lg,
    fontWeight: '700',
  },
  doneButton: {
    width:      90,
    alignItems: 'flex-end',
  },
  doneText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  instruction: {
    color:        colors.textMuted,
    fontSize:     fontSize.sm,
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
  wheelContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  centerBand: {
    position:          'absolute',
    left:              0,
    right:             0,
    height:            ITEM_HEIGHT,
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
    height:          CENTER_OFFSET - ITEM_HEIGHT * 0.1,
    backgroundColor: colors.background,
    opacity:         0.82,
    zIndex:          2,
  },
  fadeBottom: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          CENTER_OFFSET - ITEM_HEIGHT * 0.1,
    backgroundColor: colors.background,
    opacity:         0.82,
    zIndex:          2,
  },
  confirmArea: {
    flex:              1,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.lg,
    alignItems:        'center',
    justifyContent:    'center',
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
  confirmText: {
    color:        colors.white,
    fontSize:     fontSize.md,
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
    fontSize:   fontSize.xl,
    fontWeight: '700',
  },
  confirmPlaceholder: {
    color:    colors.textMuted,
    fontSize: fontSize.sm,
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
    borderWidth:     2,
    gap:             spacing.sm,
  },
  infoHeader: {
    marginBottom: spacing.xs,
  },
  infoTitle: {
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  infoTierLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.xs,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:     spacing.xs,
  },
  infoDefinition: {
    color:      colors.white,
    fontSize:   fontSize.md,
    lineHeight: 24,
  },
  infoDivider: {
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.sm,
  },
  infoExampleLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.xs,
    fontWeight:    '600',
    letterSpacing: 0.5,
  },
  infoExample: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    lineHeight: 22,
    fontStyle:  'italic',
  },
  infoDismiss: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});