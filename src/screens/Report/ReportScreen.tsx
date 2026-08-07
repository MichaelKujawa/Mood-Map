import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { spacing, fontSize, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import { store } from '../../data/store';
import { generateAndShareReport } from '../../core/pdfExport';
import type { PersistedEntry, MonthlyStats } from '../../data/storageTypes';

interface Props {
  onClose: () => void;
}

type DateRangeOption = '30days' | '90days' | '6months' | 'allTime';

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: 'Last 30 days',  value: '30days'   },
  { label: 'Last 90 days',  value: '90days'   },
  { label: 'Last 6 months', value: '6months'  },
  { label: 'All time',      value: 'allTime'  },
];

function getDateRange(option: DateRangeOption): { from: string; to: string } {
  const today = new Date();
  const to    = today.toISOString().slice(0, 10);
  const from  = new Date(today);

  switch (option) {
    case '30days':   from.setDate(today.getDate() - 30);        break;
    case '90days':   from.setDate(today.getDate() - 90);        break;
    case '6months':  from.setMonth(today.getMonth() - 6);       break;
    case 'allTime':  from.setFullYear(today.getFullYear() - 10); break;
  }

  return { from: from.toISOString().slice(0, 10), to };
}

export default function ReportScreen({ onClose }: Props) {
      const { colors } = useTheme();

    const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [dateRange, setDateRange]       = useState<DateRangeOption>('30days');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [entryCount, setEntryCount]     = useState(0);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function loadCount() {
      const range   = getDateRange(dateRange);
      const result  = await store.getEntriesInRange(range.from, range.to);
      if (result.ok) setEntryCount(result.value.length);
      setLoading(false);
    }
    loadCount();
  }, [dateRange]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const range         = getDateRange(dateRange);
      const entriesResult = await store.getEntriesInRange(range.from, range.to);
      if (!entriesResult.ok) throw new Error(entriesResult.error);

      const entries = entriesResult.value;
      if (entries.length === 0) {
        Alert.alert('No Data', 'There are no entries in the selected date range.');
        return;
      }

      const months = [...new Set(entries.map(e => e.date.slice(0, 7)))].sort();
      const stats: MonthlyStats[] = [];
      for (const ym of months) {
        const r = await store.getMonthlyStats(ym);
        if (r.ok) stats.push(r.value);
      }

      const success = await generateAndShareReport({
        entries,
        monthStats:   stats,
        dateRange:    range,
        includeNotes,
      });

      if (success) {
        Alert.alert(
          'Report Ready',
          'Your report has been generated. Use the share sheet to save it to your files, email it, or send it to your therapist.',
          [{ text: 'Done', onPress: onClose }],
        );
      } else {
        Alert.alert('Error', 'Could not generate the report. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong generating the report.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

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
          <Text style={styles.headerTitle}>Generate Report</Text>
        </View>

        <Text style={styles.subtitle}>
          Create a PDF summary of your emotional data to save or share
          with your therapist.
        </Text>

        {/* Date range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.optionsGrid}>
            {DATE_RANGE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  dateRange === opt.value && styles.optionChipSelected,
                ]}
                onPress={() => setDateRange(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionChipText,
                  dateRange === opt.value && styles.optionChipTextSelected,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Include notes toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Contents</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.toggleLabel}>Include journal notes</Text>
              <Text style={styles.toggleSub}>
                Your written notes will appear beneath each entry.
                Only enable this if you are comfortable sharing your
                personal reflections.
              </Text>
            </View>
            <Switch
              value={includeNotes}
              onValueChange={setIncludeNotes}
              trackColor={{ false: colors.border, true: colors.purple }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Report Preview</Text>
          <View style={styles.previewItems}>
            <Text style={styles.previewItem}>✓  Score summary & trend graph</Text>
            <Text style={styles.previewItem}>✓  Monthly breakdown table</Text>
            <Text style={styles.previewItem}>✓  Full entry log with emotions</Text>
            {includeNotes && (
              <Text style={[styles.previewItem, { color: colors.purpleLight }]}>
                ✓  Journal notes included
              </Text>
            )}
          </View>
          {loading ? (
            <ActivityIndicator color={colors.purple} style={{ marginTop: spacing.md }} />
          ) : (
            <Text style={styles.entryCountText}>
              {entryCount} {entryCount === 1 ? 'entry' : 'entries'} in selected range
            </Text>
          )}
        </View>

        {/* Privacy reminder */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Your data stays private</Text>
          <Text style={styles.privacyText}>
            This report is generated entirely on your device. Nothing is
            uploaded or shared unless you explicitly choose to share it
            using the button below.
          </Text>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.8}
        >
          {generating
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.generateButtonText}>Generate & Share PDF</Text>
          }
        </TouchableOpacity>

      </ScrollView>
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
  },
  closeText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },
  subtitle: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 22,
    marginTop:  -spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    borderColor:       colors.border,
    backgroundColor:   colors.card,
  },
  optionChipSelected: {
    backgroundColor: colors.purple,
    borderColor:     colors.purpleLight,
  },
  optionChipText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: colors.white,
  },
  toggleRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing.md,
  },
  toggleLeft: {
    flex: 1,
    gap:  spacing.xs,
  },
  toggleLabel: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '600',
  },
  toggleSub: {
    color:      colors.textMuted,
    fontSize:   fontSize.xs,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing.sm,
  },
  previewTitle: {
    color:        colors.white,
    fontSize:     fontSize.md,
    fontWeight:   '700',
    marginBottom: spacing.xs,
  },
  previewItems: {
    gap: spacing.xs,
  },
  previewItem: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 22,
  },
  entryCountText: {
    color:      colors.purpleLight,
    fontSize:   fontSize.sm,
    fontWeight: '600',
    marginTop:  spacing.sm,
  },
  privacyCard: {
    backgroundColor: 'rgba(107,79,160,0.12)',
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     'rgba(107,79,160,0.3)',
    gap:             spacing.sm,
  },
  privacyTitle: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  privacyText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: colors.purple,
    borderRadius:    radius.md,
    paddingVertical: spacing.lg,
    alignItems:      'center',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '800',
  },
});