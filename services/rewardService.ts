import { RewardState, RewardEvent } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

const REWARD_KEY = 'suman_rewards_v1';
const EVENT_NAME = 'REWARD_EARNED';

// Helper to get current user ID
const getCurrentUserId = () => auth.currentUser?.uid;

const getInitialState = (): RewardState => {
  try {
    const saved = localStorage.getItem(REWARD_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Silent fail
  }
  return {
    points: 0,
    streak: 0,
    lastActiveDate: '',
    level: 1
  };
};

export const getRewardState = (): RewardState => {
  return getInitialState();
};

// Sync local state with Firestore when user logs in
export const syncRewardsWithFirestore = async (): Promise<boolean> => {
  const uid = getCurrentUserId();
  if (!uid) return false;

  const userRef = doc(db, 'users', uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Merge firestore data with local state structure
      const remoteState: RewardState = {
        points: data.points || 0,
        streak: data.streak || 0,
        lastActiveDate: data.lastActiveDate || '',
        level: data.level || 1
      };

      // Update local storage with remote data
      // await saveState to ensure local storage is ready before returning
      await saveState(remoteState, false); // false = don't double sync
      return true;
    } else {
      // First time user in creating doc document
      const initialState = getInitialState();
      await setDoc(userRef, initialState, { merge: true });
      return true;
    }
  } catch (error) {
    // Silent fail
    return false;
  }
};

export const checkDailyStreak = async () => {
  const state = getInitialState();
  const today = new Date().toDateString();
  const lastDate = state.lastActiveDate;

  // If already active today, do nothing
  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = state.streak;

  if (lastDate === yesterday.toDateString()) {
    // Continued streak
    newStreak += 1;
    dispatchReward({ pointsAdded: 50, message: "Daily Streak Kept! 🔥", type: 'STREAK' });
  } else {
    // Streak broken or new user
    newStreak = 1;
    // Don't alert for streak reset, just set it
  }

  const newState: RewardState = {
    ...state,
    streak: newStreak,
    lastActiveDate: today
  };

  await saveState(newState);
};

export const addPoints = async (amount: number, message: string, type: RewardEvent['type']) => {
  const state = getInitialState();
  const newPoints = state.points + amount;
  const newLevel = Math.floor(newPoints / 500) + 1;

  const newState: RewardState = {
    ...state,
    points: newPoints,
    level: newLevel,
    // Update active date on any activity to ensure streak is maintained
    lastActiveDate: new Date().toDateString()
  };

  await saveState(newState);
  dispatchReward({ pointsAdded: amount, message, type });
};

const saveState = async (state: RewardState, syncToCloud = true) => {
  // 1. Save to Local Storage (Immediate UI update)
  localStorage.setItem(REWARD_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('storage'));

  // 2. Sync to Firestore (Background)
  if (syncToCloud) {
    const uid = getCurrentUserId();
    if (uid) {
      const userRef = doc(db, 'users', uid);
      try {
        await setDoc(userRef, {
          points: state.points,
          streak: state.streak,
          lastActiveDate: state.lastActiveDate,
          level: state.level,
          lastUpdated: new Date()
        }, { merge: true });
      } catch (error) {
        // Silent fail
      }
    }
  }
};

const dispatchReward = (event: RewardEvent) => {
  const customEvent = new CustomEvent(EVENT_NAME, { detail: event });
  window.dispatchEvent(customEvent);
};

export const onReward = (callback: (event: RewardEvent) => void) => {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<RewardEvent>;
    callback(customEvent.detail);
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
