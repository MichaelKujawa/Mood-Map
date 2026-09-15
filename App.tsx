import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, BackHandler, Platform } from 'react-native';
import { store } from './src/data/store';
import { colors } from './src/theme';
import { ThemeProvider } from './src/theme/ThemeContext';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import HomeScreen from './src/screens/Home/HomeScreen';
import EmotionWheelScreen from './src/screens/EmotionWheel/EmotionWheelScreen';
import EmotionDetailScreen from './src/screens/EmotionDetail/EmotionDetailScreen';
import EntrySummaryScreen from './src/screens/EntrySummary/EntrySummaryScreen';
import type { SelectedEmotion } from './src/screens/EmotionWheel/EmotionWheelScreen';
import type { CompletedEmotion } from './src/screens/EmotionDetail/EmotionDetailScreen';
import HistoryScreen from './src/screens/History/HistoryScreen';
import InsightScreen from './src/screens/Insight/InsightScreen';
import SettingsScreen from './src/screens/Settings/SettingsScreen';
import ReportScreen from './src/screens/Report/ReportScreen';
import ChildrenWheelScreen from './src/screens/EmotionWheel/ChildrenWheelScreen';

type Screen = 'loading' | 'onboarding' | 'home' | 'wheel' | 'detail' | 'summary' | 'history' | 'insight' | 'settings' | 'report';

// ── Inner app — must live inside ThemeProvider so useTheme works ─────────────

function AppInner() {
  const [screen, setScreen]                       = useState<Screen>('loading');
  const [completedEmotions, setCompletedEmotions] = useState<CompletedEmotion[]>([]);
  const [currentEmotion, setCurrentEmotion]       = useState<SelectedEmotion | null>(null);
  const [childrenMode, setChildrenMode]           = useState(false);

  useEffect(() => {
    async function init() {
      const done  = await store.hasCompletedOnboarding();
      const prefs = await store.getPreferences();
      setChildrenMode((prefs as any).childrenMode === true);
      setScreen(done ? 'home' : 'onboarding');
    }
    init();
  }, []);

  async function handleOnboardingDone() {
    await store.setOnboardingComplete();
    setScreen('home');
  }

  function handleEmotionSelected(emotion: SelectedEmotion) {
    setCurrentEmotion(emotion);
    setScreen('detail');
  }

  function handleEmotionCompleted(completed: CompletedEmotion) {
    setCompletedEmotions(prev => [...prev, completed]);
    setCurrentEmotion(null);
    setScreen('wheel');
  }

  function handleDetailDone(completed: CompletedEmotion) {
    setCompletedEmotions(prev => [...prev, completed]);
    setCurrentEmotion(null);
    setScreen('summary');
  }

  // ── Named navigation actions ────────────────────────────────────────────
  // Pulled out (rather than left as inline JSX closures) so the hardware
  // back button below can trigger the exact same logic as the on-screen
  // back/close buttons.

  const goHome = useCallback(() => {
    setScreen('home');
  }, []);

  const handleWheelClose = useCallback(() => {
    if (completedEmotions.length > 0) {
      Alert.alert(
        'Discard Entry?',
        'You have emotions saved in this session. Going back will lose all of them.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text:  'Discard',
            style: 'destructive',
            onPress: () => {
              setCompletedEmotions([]);
              setCurrentEmotion(null);
              setScreen('home');
            },
          },
        ],
      );
    } else {
      setScreen('home');
    }
  }, [completedEmotions.length]);

  const handleChildrenWheelClose = useCallback(() => {
    if (completedEmotions.length > 0) {
      Alert.alert(
        'Discard Entry?',
        'You have emotions saved. Going back will lose all of them.',
        [
          { text: 'Keep Going', style: 'cancel' },
          {
            text:  'Discard',
            style: 'destructive',
            onPress: () => {
              setCompletedEmotions([]);
              setScreen('home');
            },
          },
        ],
      );
    } else {
      setScreen('home');
    }
  }, [completedEmotions.length]);

  const handleChildrenWheelDone = useCallback(() => {
    setScreen(completedEmotions.length > 0 ? 'summary' : 'home');
  }, [completedEmotions.length]);

  const handleDetailBack = useCallback(() => {
    setCurrentEmotion(null);
    setScreen('wheel');
  }, []);

  const handleSummaryEdit = useCallback(() => {
    setScreen('wheel');
  }, []);

  const handleSummarySave = useCallback(() => {
    setCompletedEmotions([]);
    setScreen('home');
  }, []);

  const handleViewTutorial = useCallback(() => {
    store.setOnboardingComplete();
    setScreen('onboarding');
  }, []);

  // ── Hardware back button (Android) ──────────────────────────────────────
  // Without this, Android's back gesture/button exits the whole app instead
  // of stepping back through the in-app screen stack, since this app drives
  // navigation off local state rather than @react-navigation's stack.

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      switch (screen) {
        case 'home':
          // Root screen — let the OS handle it (background/exit the app),
          // which matches standard Android convention.
          return false;

        case 'wheel':
          if (childrenMode) {
            handleChildrenWheelClose();
          } else {
            handleWheelClose();
          }
          return true;

        case 'detail':
          handleDetailBack();
          return true;

        case 'summary':
          handleSummaryEdit();
          return true;

        case 'history':
        case 'insight':
        case 'settings':
        case 'report':
          goHome();
          return true;

        case 'onboarding':
          // Don't let back-button skip out of onboarding early.
          return true;

        default:
          return false;
      }
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    screen,
    childrenMode,
    goHome,
    handleWheelClose,
    handleChildrenWheelClose,
    handleDetailBack,
    handleSummaryEdit,
  ]);

  if (screen === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingDone}
        onSkip={handleOnboardingDone}
      />
    );
  }

  if (screen === 'wheel') {
    if (childrenMode) {
      return (
        <ChildrenWheelScreen
          onEmotionCompleted={(completed) => {
            setCompletedEmotions(prev => [...prev, completed]);
          }}
          onDone={handleChildrenWheelDone}
          onClose={handleChildrenWheelClose}
          completedCount={completedEmotions.length}
        />
      );
    }

    return (
      <EmotionWheelScreen
        onEmotionConfirmed={handleEmotionSelected}
        onDone={() => setScreen(completedEmotions.length > 0 ? 'summary' : 'home')}
        onClose={handleWheelClose}
        selectedCount={completedEmotions.length}
      />
    );
  }

  if (screen === 'detail' && currentEmotion) {
    return (
      <EmotionDetailScreen
        coreEmotion={currentEmotion.coreEmotion}
        tier={currentEmotion.tier}
        derivative={currentEmotion.derivative}
        entryNumber={completedEmotions.length + 1}
        totalSoFar={completedEmotions.length}
        onConfirm={handleEmotionCompleted}
        onBack={handleDetailBack}
        onDone={handleDetailDone}
      />
    );
  }

  if (screen === 'summary') {
    return (
      <EntrySummaryScreen
        emotions={completedEmotions}
        onSave={handleSummarySave}
        onEdit={handleSummaryEdit}
      />
    );
  }

  if (screen === 'history') {
    return <HistoryScreen onClose={goHome} />;
  }

  if (screen === 'insight') {
    return <InsightScreen onClose={goHome} />;
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onClose={goHome}
        onViewTutorial={handleViewTutorial}
        onGenerateReport={() => setScreen('report')}
        onChildrenModeChange={(enabled) => setChildrenMode(enabled)}
      />
    );
  }

  if (screen === 'report') {
    return <ReportScreen onClose={goHome} />;
  }

  return (
    <HomeScreen
      onNavigate={(navScreen) => {
        if (navScreen === 'newEntry') {
          setCompletedEmotions([]);
          setCurrentEmotion(null);
          setScreen('wheel');
        }
        if (navScreen === 'history')  setScreen('history');
        if (navScreen === 'insight')  setScreen('insight');
        if (navScreen === 'settings') setScreen('settings');
      }}
    />
  );
}

// ── Root app — ThemeProvider wraps everything ─────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex:            1,
    backgroundColor: colors.background,
    justifyContent:  'center',
    alignItems:      'center',
  },
});