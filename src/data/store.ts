// MoodMap — App Store
// Wires the real AsyncStorage into our data layer.
// Import { store } from here anywhere in the app that needs data access.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from './storage';

export const store = createStore(AsyncStorage);