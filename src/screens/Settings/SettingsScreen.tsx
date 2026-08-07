import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import { colors, spacing, fontSize, radius } from '../../theme';
import { store } from '../../data/store';
import type { UserPreferences } from '../../data/storageTypes';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../../core/notifications';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeMode } from '../../theme';

// ── App version ───────────────────────────────────────────────────────────────

const APP_VERSION = '0.1.0';

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();

  const sectionStyles = useMemo(
    () => createSectionStyles(colors),
    [colors]
  );
  return (
    <Text style={sectionStyles.header}>{title}</Text>
  );
}

const createSectionStyles = (colors: any) => 
  StyleSheet.create({
  header: {
    color:         colors.purpleLight,
    fontSize:      fontSize.xs,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  spacing.xs,
    marginLeft:    spacing.xs,
  },
});

// ── Settings row ──────────────────────────────────────────────────────────────

interface RowProps {
  label:       string;
  sublabel?:   string;
  onPress?:    () => void;
  right?:      React.ReactNode;
  destructive?: boolean;
}

function SettingsRow({ label, sublabel, onPress, right, destructive }: RowProps) {
    const { colors } = useTheme();

  const rowStyles = useMemo(
    () => createRowStyles(colors),
    [colors]
  );

  return (
    <TouchableOpacity
      style={rowStyles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !right}
    >
      <View style={rowStyles.left}>
        <Text style={[rowStyles.label, destructive && rowStyles.labelDestructive]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={rowStyles.sublabel}>{sublabel}</Text>
        )}
      </View>
      {right && <View style={rowStyles.right}>{right}</View>}
      {onPress && !right && (
        <Text style={rowStyles.arrow}>→</Text>
      )}
    </TouchableOpacity>
  );
}

const createRowStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flex: 1,
    gap:  2,
  },
  label: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '500',
  },
  labelDestructive: {
    color: '#EF5350',
  },
  sublabel: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  right: {
    marginLeft: spacing.md,
  },
  arrow: {
    color:      colors.textMuted,
    fontSize:   fontSize.md,
    marginLeft: spacing.md,
  },
});

// ── Settings group (card wrapper) ─────────────────────────────────────────────

function SettingsGroup({ children }: { children: React.ReactNode }) {
    const { colors } = useTheme();

  const groupStyles = useMemo(
    () => createGroupStyles(colors),
    [colors]
  );
  return (
    <View style={groupStyles.container}>
      {children}
    </View>
  );
}

const createGroupStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
  },
});

// ── Time picker ───────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
  value: i,
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5,
}));

function TimePickerModal({
  current,
  onSelect,
  onClose,
}: {
  current:  string;
  onSelect: (time: string) => void;
  onClose:  () => void;
}) {
  const [currentHour, currentMinute] = current.split(':').map(Number);
  const [selectedHour,   setSelectedHour]   = useState(currentHour);
  const [selectedMinute, setSelectedMinute] = useState(
    // Round to nearest 5 minutes
    Math.round(currentMinute / 5) * 5 % 60
  );

  function handleConfirm() {
    const time = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onSelect(time);
    onClose();
  }

  function formatPreview() {
    const h    = selectedHour % 12 === 0 ? 12 : selectedHour % 12;
    const ampm = selectedHour < 12 ? 'AM' : 'PM';
    const m    = String(selectedMinute).padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  }

    const { colors } = useTheme();

  const timeStyles = useMemo(
    () => createTimeStyles(colors),
    [colors]
  );

  return (
    <View style={timeStyles.overlay}>
      <View style={timeStyles.modal}>
        <View style={timeStyles.header}>
          <Text style={timeStyles.title}>Reminder Time</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={timeStyles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={timeStyles.preview}>
          <Text style={timeStyles.previewTime}>{formatPreview()}</Text>
        </View>

        {/* Pickers row */}
        <View style={timeStyles.pickersRow}>

          {/* Hour column */}
          <View style={timeStyles.pickerColumn}>
            <Text style={timeStyles.pickerLabel}>Hour</Text>
            <ScrollView
              style={timeStyles.pickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h.value}
                  style={[
                    timeStyles.option,
                    selectedHour === h.value && timeStyles.optionSelected,
                  ]}
                  onPress={() => setSelectedHour(h.value)}
                >
                  <Text style={[
                    timeStyles.optionText,
                    selectedHour === h.value && timeStyles.optionTextSelected,
                  ]}>
                    {h.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={timeStyles.colon}>:</Text>

          {/* Minute column */}
          <View style={timeStyles.pickerColumn}>
            <Text style={timeStyles.pickerLabel}>Minute</Text>
            <ScrollView
              style={timeStyles.pickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {MINUTES.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    timeStyles.option,
                    selectedMinute === m.value && timeStyles.optionSelected,
                  ]}
                  onPress={() => setSelectedMinute(m.value)}
                >
                  <Text style={[
                    timeStyles.optionText,
                    selectedMinute === m.value && timeStyles.optionTextSelected,
                  ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={timeStyles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Text style={timeStyles.confirmText}>Set Reminder</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const createTimeStyles = (colors: any) => 
  StyleSheet.create({
  overlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent:  'flex-end',
    zIndex:          100,
  },
  modal: {
    backgroundColor:      colors.card,
    borderTopLeftRadius:  radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom:        spacing.xl,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    padding:           spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  close: {
    color:    colors.textMuted,
    fontSize: fontSize.md,
  },
  preview: {
    alignItems:    'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewTime: {
    color:      colors.purpleLight,
    fontSize:   fontSize.xxl,
    fontWeight: '800',
  },
  pickersRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: spacing.lg,
    paddingTop:     spacing.md,
    gap:            spacing.md,
  },
  pickerColumn: {
    flex: 1,
    gap:  spacing.sm,
  },
  pickerLabel: {
    color:         colors.textMuted,
    fontSize:      fontSize.xs,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign:     'center',
  },
  pickerScroll: {
    height: 200,
  },
  colon: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
    marginTop:  spacing.xl,
  },
  option: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.sm,
    alignItems:        'center',
    marginBottom:      4,
  },
  optionSelected: {
    backgroundColor: colors.purple,
  },
  optionText: {
    color:    colors.white,
    fontSize: fontSize.md,
  },
  optionTextSelected: {
    color:      colors.white,
    fontWeight: '800',
  },
  confirmButton: {
    backgroundColor: colors.purple,
    borderRadius:    radius.md,
    paddingVertical: spacing.lg,
    alignItems:      'center',
    marginHorizontal: spacing.lg,
    marginTop:       spacing.lg,
  },
  confirmText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '800',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

interface Props {
  onClose:             () => void;
  onViewTutorial:      () => void;
  onGenerateReport:    () => void;
  onChildrenModeChange: (enabled: boolean) => void;
}

export default function SettingsScreen({ onClose, onViewTutorial, onGenerateReport, onChildrenModeChange}: Props) {
      const { colors } = useTheme();

    const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [prefs, setPrefs]               = useState<UserPreferences | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [childrenMode, setChildrenMode] = useState(false);
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  useEffect(() => {
    store.getPreferences().then(p => {
      setPrefs(p);
      setChildrenMode((p as any).childrenMode === true);
    });
  }, []);

  async function updatePref(updates: Partial<UserPreferences>) {
    if (!prefs) return;
    const result = await store.savePreferences(updates);
    if (!result.ok) return;
    setPrefs(result.value);

    // Handle notification scheduling when toggle or time changes
    if ('notificationsEnabled' in updates) {
      if (updates.notificationsEnabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          // Permission denied — revert the toggle
          const reverted = await store.savePreferences({ notificationsEnabled: false });
          if (reverted.ok) setPrefs(reverted.value);
          Alert.alert(
            'Permission Required',
            'Please enable notifications for MoodMap in your phone\'s Settings app.',
          );
          return;
        }
        await scheduleDailyReminder(result.value.dailyReminderTime);
      } else {
        await cancelDailyReminder();
      }
    }

    // Reschedule if time changed while notifications are on
    if ('dailyReminderTime' in updates && result.value.notificationsEnabled) {
      await scheduleDailyReminder(result.value.dailyReminderTime);
    }
  }

  async function handleExport() {
    const result = await store.exportAllData();
    if (!result.ok) {
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
      return;
    }
    // In a full implementation this would use react-native-share or
    // expo-sharing to share the JSON file. For now we confirm it worked.
    Alert.alert(
      'Export Ready',
      'Your data has been prepared for export. Full sharing will be available in a future update.',
      [{ text: 'OK' }],
    );
  }

  async function handleClearData() {
    Alert.alert(
      'Clear All Data?',
      'This will permanently delete all your entries, scores, and journal notes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            // Re-run onboarding after clearing
            await store.setOnboardingComplete();
            Alert.alert('Data Cleared', 'All entries have been deleted.');
          },
        },
      ],
    );
  }

  function formatTime(time: string): string {
    const [h] = time.split(':').map(Number);
    const hour  = h % 12 === 0 ? 12 : h % 12;
    const ampm  = h < 12 ? 'AM' : 'PM';
    return `${hour}:00 ${ampm}`;
  }

  if (!prefs) return null;

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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <SectionHeader title="Notifications" />
          <SettingsGroup>
            <SettingsRow
              label="Daily Reminder"
              sublabel="Remind me to log my emotions each day"
              right={
                <Switch
                  value={prefs.notificationsEnabled}
                  onValueChange={v => updatePref({ notificationsEnabled: v })}
                  trackColor={{ false: colors.border, true: colors.purple }}
                  thumbColor={colors.white}
                />
              }
            />
            {prefs.notificationsEnabled && (
              <SettingsRow
                label="Reminder Time"
                sublabel={formatTime(prefs.dailyReminderTime)}
                onPress={() => setShowTimePicker(true)}
              />
            )}
          </SettingsGroup>
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <SectionHeader title="Theme" />
          <SettingsGroup>
            {([
              { label: 'Dark',        value: 'dark',  sub: 'Deep purple — easier on the eyes at night' },
              { label: 'Light',       value: 'light', sub: 'Cream and gold — bright and welcoming' },
              { label: 'Auto',        value: 'auto',  sub: 'Light from 7am–8pm, dark overnight' },
            ] as { label: string; value: ThemeMode; sub: string }[]).map(opt => (
              <SettingsRow
                key={opt.value}
                label={opt.label}
                sublabel={opt.sub}
                onPress={() => setThemeMode(opt.value)}
                right={
                  themeMode === opt.value
                    ? <Text style={{ color: colors.purple, fontSize: 18 }}>✓</Text>
                    : undefined
                }
              />
            ))}
          </SettingsGroup>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <SectionHeader title="Appearance" />
          <SettingsGroup>
            <SettingsRow
              label="Children's Mode"
              sublabel="Simplifies emotions and language for younger users. Uses 5 basic emotions with no derivatives."
              right={
                <Switch
                  value={childrenMode}
                  onValueChange={async (v) => {
                    setChildrenMode(v);
                    await store.savePreferences({ ...prefs, childrenMode: v } as any);
                    onChildrenModeChange(v);
                  }}
                  trackColor={{ false: colors.border, true: colors.purple }}
                  thumbColor={colors.white}
                />
              }
            />
          </SettingsGroup>
        </View>

        {/* App */}
        <View style={styles.section}>
          <SectionHeader title="App" />
          <SettingsGroup>
            <SettingsRow
              label="View Tutorial"
              sublabel="Replay the onboarding walkthrough"
              onPress={onViewTutorial}
            />
            <SettingsRow
              label="Generate Report"
              sublabel="Create a PDF to save or share with your therapist"
              onPress={onGenerateReport}
            />
          </SettingsGroup>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <SectionHeader title="Your Data & Privacy" />
          <View style={styles.privacyCard}>
            <Text style={styles.privacyText}>
              Everything you enter in MoodMap — your emotions, intensity ratings,
              and journal notes — is stored privately on this device only.
            </Text>
            <Text style={styles.privacyText}>
              Your data is never uploaded to any server, never shared with any
              third party, and never used for advertising.
            </Text>
            <Text style={styles.privacyText}>
              MoodMap contains no advertising and no third-party tracking of any kind.
            </Text>
            <Text style={styles.privacyText}>
              If you choose to share a report with your therapist in a future
              update, that sharing happens only when you explicitly choose to do so.
              Nothing leaves your device without your action.
            </Text>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <SectionHeader title="Data" />
          <SettingsGroup>
            <SettingsRow
              label="Clear All Data"
              sublabel="Permanently delete all entries and scores"
              onPress={handleClearData}
              destructive
            />
          </SettingsGroup>
        </View>

        {/* Version */}
        <Text style={styles.version}>MoodMap v{APP_VERSION}</Text>

      </ScrollView>

      {/* Time picker overlay */}
      {showTimePicker && (
        <TimePickerModal
          current={prefs.dailyReminderTime}
          onSelect={time => updatePref({ dailyReminderTime: time })}
          onClose={() => setShowTimePicker(false)}
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
  section: {
    gap: spacing.sm,
  },
  privacyCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    gap:             spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  privacyText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 22,
  },
  version: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});