import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
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

  function handleWheelDone() {
    if (completedEmotions.length > 0) {
      setScreen('summary');
    } else {
      setScreen('home');
    }
  }

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
          onDone={() => {
            if (completedEmotions.length > 0) {
              setScreen('summary');
            } else {
              setScreen('home');
            }
          }}
          onClose={() => {
            if (completedEmotions.length > 0) {
              Alert.alert(
                'Discard Entry?',
                'You have emotions saved. Going back will lose all of them.',
                [
                  { text: 'Keep Going', style: 'cancel' },
                  {
                    text: 'Discard',
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
          }}
          completedCount={completedEmotions.length}
        />
      );
    }

    return (
      <EmotionWheelScreen
        onEmotionConfirmed={handleEmotionSelected}
        onDone={handleWheelDone}
        onClose={() => {
          if (completedEmotions.length > 0) {
            Alert.alert(
              'Discard Entry?',
              'You have emotions saved in this session. Going back will lose all of them.',
              [
                { text: 'Keep Editing', style: 'cancel' },
                {
                  text: 'Discard',
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
        }}
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
        onBack={() => {
          setCurrentEmotion(null);
          setScreen('wheel');
        }}
        onDone={handleDetailDone}
      />
    );
  }

  if (screen === 'summary') {
    return (
      <EntrySummaryScreen
        emotions={completedEmotions}
        onSave={() => {
          setCompletedEmotions([]);
          setScreen('home');
        }}
        onEdit={() => setScreen('wheel')}
      />
    );
  }

  if (screen === 'history') {
    return <HistoryScreen onClose={() => setScreen('home')} />;
  }

  if (screen === 'insight') {
    return <InsightScreen onClose={() => setScreen('home')} />;
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onClose={() => setScreen('home')}
        onViewTutorial={() => {
          store.setOnboardingComplete();
          setScreen('onboarding');
        }}
        onGenerateReport={() => setScreen('report')}
        onChildrenModeChange={(enabled) => setChildrenMode(enabled)}
      />
    );
  }

  if (screen === 'report') {
    return <ReportScreen onClose={() => setScreen('home')} />;
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