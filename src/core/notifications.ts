// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Notification Service
//
// Handles requesting permissions, scheduling daily reminders,
// and cancelling them when the user turns them off.
// ─────────────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ── Notification behavior while app is foregrounded ──────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ── Notification ID ───────────────────────────────────────────────────────────
// We use a fixed identifier so we can cancel and reschedule cleanly

const DAILY_REMINDER_ID = 'moodmap-daily-reminder';

// ── Permission request ────────────────────────────────────────────────────────

/**
 * Requests notification permissions from the user.
 * Returns true if permissions were granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Notifications don't work in simulators
    console.log('Notifications not available in simulator');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'default',
      importance:       Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule daily reminder ───────────────────────────────────────────────────

/**
 * Schedules a daily reminder at the specified time.
 * Cancels any existing reminder first to avoid duplicates.
 *
 * @param time - "HH:MM" in 24-hour format, e.g. "20:00"
 */
export async function scheduleDailyReminder(time: string): Promise<boolean> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;

    // Cancel existing reminder first
    await cancelDailyReminder();

    const [hour, minute] = time.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'MoodMap',
        body:  'How are you feeling today? Take a moment to log your emotions.',
        sound: false,
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return true;
  } catch (e) {
    console.error('Failed to schedule notification:', e);
    return false;
  }
}

// ── Cancel reminder ───────────────────────────────────────────────────────────

/**
 * Cancels the daily reminder if one is scheduled.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // Notification may not exist — that's fine
  }
}

// ── Check if reminder is scheduled ───────────────────────────────────────────

/**
 * Returns true if a daily reminder is currently scheduled.
 */
export async function isDailyReminderScheduled(): Promise<boolean> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(n => n.identifier === DAILY_REMINDER_ID);
  } catch {
    return false;
  }
}