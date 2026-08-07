// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — Children's Mode
//
// Simplified emotion set for younger users.
// Five core emotions, no derivatives, age-appropriate language.
// The scoring engine is unchanged — only the display layer differs.
// ─────────────────────────────────────────────────────────────────────────────

import type { CoreEmotion, EmotionTier } from './types';

// ── Children's emotion definition ────────────────────────────────────────────

export interface ChildEmotion {
  id:           string;
  label:        string;       // what the child sees
  color:        string;
  emoji:        string;
  coreEmotion:  CoreEmotion;  // maps to Plutchik for scoring
  tier:         EmotionTier;  // which tier to use for scoring
  definition:   string;       // simple, child-friendly
  example:      string;       // relatable to a child's life
  journalPrompt: string;      // age-appropriate journal question
}

export const CHILDREN_EMOTIONS: ChildEmotion[] = [
  {
    id:           'happy',
    label:        'Happy',
    color:        '#FFD700',
    emoji:        '😊',
    coreEmotion:  'Joy',
    tier:         'core',
    definition:   'That warm, good feeling inside when something nice happens.',
    example:      'You might feel Happy when you get to play with your best friend or eat your favorite food.',
    journalPrompt: 'What made you feel happy today?',
  },
  {
    id:           'sad',
    label:        'Sad',
    color:        '#6B9FD4',
    emoji:        '😢',
    coreEmotion:  'Sadness',
    tier:         'core',
    definition:   'That heavy feeling when something goes wrong or someone you care about isn\'t there.',
    example:      'You might feel Sad when a friend moves away or when something you were looking forward to gets cancelled.',
    journalPrompt: 'What made you feel sad today?',
  },
  {
    id:           'angry',
    label:        'Angry',
    color:        '#E74C3C',
    emoji:        '😠',
    coreEmotion:  'Anger',
    tier:         'core',
    definition:   'That hot, tight feeling when something seems really unfair or someone upsets you.',
    example:      'You might feel Angry when someone takes your things without asking or when you get blamed for something you didn\'t do.',
    journalPrompt: 'What made you feel angry today?',
  },
  {
    id:           'nervous',
    label:        'Nervous',
    color:        '#90C97A',
    emoji:        '😰',
    coreEmotion:  'Fear',
    tier:         'mild',
    definition:   'That fluttery, worried feeling when you\'re not sure what\'s going to happen.',
    example:      'You might feel Nervous before a test at school or the first day somewhere new.',
    journalPrompt: 'What made you feel nervous today?',
  },
  {
    id:           'bored',
    label:        'Bored',
    color:        '#9B59B6',
    emoji:        '😑',
    coreEmotion:  'Disgust',
    tier:         'mild',
    definition:   'That flat, restless feeling when nothing feels interesting or fun.',
    example:      'You might feel Bored when you have nothing to do or when something takes a really long time.',
    journalPrompt: 'What made you feel bored today?',
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getChildEmotion(id: string): ChildEmotion | undefined {
  return CHILDREN_EMOTIONS.find(e => e.id === id);
}

// ── Intensity labels for children ─────────────────────────────────────────────
// Replaces the 1–10 numeric scale with descriptive labels

export interface IntensityLevel {
  value:  number;
  label:  string;
  emoji:  string;
}

export const CHILDREN_INTENSITY_LEVELS: IntensityLevel[] = [
  { value: 2,  label: 'A little bit',   emoji: '🌱' },
  { value: 4,  label: 'Quite a bit',    emoji: '🌿' },
  { value: 7,  label: 'A whole lot',    emoji: '🌳' },
  { value: 9,  label: 'More than ever', emoji: '🌋' },
];
