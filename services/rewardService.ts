import { RewardState, RewardEvent } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const REWARD_KEY = 'suman_rewards_v1';
const EVENT_NAME = 'REWARD_EARNED';

// Helper to get current user ID
const getCurrentUserId = () => auth.currentUser?.uid;

const getInitialState = (): RewardState => {
  try {
    const saved = localStorage.getItem(REWARD_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: Ensure activityHistory exists
      if (!parsed.activityHistory) parsed.activityHistory = [];
      return parsed;
    }
  } catch (e) {
    // Silent fail
  }
  return {
    points: 0,
    streak: 0,
    lastActiveDate: '',
    level: 1,
    activityHistory: []
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
        level: data.level || 1,
        activityHistory: data.activityHistory || []
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

  // Ensure history exists
  const history = state.activityHistory || [];

  // If already active today, do nothing (but ensure history is consistent)
  if (lastDate === today) {
    if (!history.includes(today)) {
      const updatedHistory = [...history, today];
      await saveState({ ...state, activityHistory: updatedHistory });
    }
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = state.streak;
  let pointsToAdd = 0;

  if (lastDate === yesterday.toDateString()) {
    // Continued streak
    newStreak += 1;
    pointsToAdd = 20;
    dispatchReward({ pointsAdded: 20, message: "Daily Streak Kept! 🔥", type: 'STREAK' });
  } else {
    // Streak broken or new user
    newStreak = 1;
    pointsToAdd = 20; // Award points for logging in even if streak broken
    dispatchReward({ pointsAdded: 20, message: "Daily Login Bonus! ☀️", type: 'STREAK' });
  }

  const newPoints = state.points + pointsToAdd;
  const newLevel = Math.floor(newPoints / 500) + 1;

  // Add today to history
  const newHistory = [...history];
  if (!newHistory.includes(today)) {
    newHistory.push(today);
  }

  const newState: RewardState = {
    ...state,
    points: newPoints,
    level: newLevel,
    streak: newStreak,
    lastActiveDate: today,
    activityHistory: newHistory
  };

  await saveState(newState);
};

export const addPoints = async (amount: number, message: string, type: RewardEvent['type']) => {
  const state = getInitialState();
  const newPoints = state.points + amount;
  const newLevel = Math.floor(newPoints / 500) + 1;
  const today = new Date().toDateString();

  // Update history
  const history = state.activityHistory || [];
  const newHistory = [...history];
  if (!newHistory.includes(today)) {
    newHistory.push(today);
  }

  const newState: RewardState = {
    ...state,
    points: newPoints,
    level: newLevel,
    // Update active date on any activity to ensure streak is maintained
    lastActiveDate: today,
    activityHistory: newHistory
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
        // Also save generic profile info for leaderboard
        const user = auth.currentUser;

        await setDoc(userRef, {
          points: state.points,
          streak: state.streak,
          lastActiveDate: state.lastActiveDate,
          level: state.level,
          activityHistory: state.activityHistory,
          lastUpdated: new Date(),
          displayName: user?.displayName || 'Anonymous',
          photoURL: user?.photoURL || null
        }, { merge: true });
      } catch (error) {
        // Silent fail
      }
    }
  }
};

export interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  streak: number;
  avatar: string | null;
  isCurrentUser: boolean;
}

export const getLeaderboardData = async (): Promise<LeaderboardUser[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy("points", "desc"), limit(50));
    const querySnapshot = await getDocs(q);

    const currentUserId = getCurrentUserId();

    const leaderboard: LeaderboardUser[] = [];

    let rank = 1;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      leaderboard.push({
        rank: rank++,
        name: data.displayName || 'Anonymous',
        points: data.points || 0,
        streak: data.streak || 0,
        avatar: data.photoURL || null,
        isCurrentUser: doc.id === currentUserId
      });
    });

    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
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

// DEV TOOL: Simulate Streak
// Usage: Open console, type window.simulateStreak(30)
(window as any).simulateStreak = async (days: number) => {
  console.log(`Simulating ${days} days streak...`);
  const state = getInitialState();

  // Logic: Day 1 = 0 bonus. Day 2..days = +20 per day.
  const bonusDays = Math.max(0, days - 1);
  const pointsEarned = bonusDays * 20;

  // Generate history
  const history: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    history.push(d.toDateString());
  }

  const newState: RewardState = {
    ...state,
    streak: days,
    points: state.points + pointsEarned,
    level: Math.floor((state.points + pointsEarned) / 500) + 1,
    lastActiveDate: new Date().toDateString(),
    activityHistory: history
  };

  await saveState(newState);
  window.location.reload(); // Force reload to see changes instantly
};

export const getLevelTitle = (points: number) => {
  if (points < 500) return "Smiling Starter";
  if (points < 1000) return "Giggle Generator";
  if (points < 2000) return "Joyful Journeyer";
  return "Laughter Master";
};

export const calculateLongestStreak = (history: string[]) => {
  if (!history || history.length === 0) return 0;

  // Convert to timestamps and sort
  const timestamps = history.map(date => new Date(date).setHours(0, 0, 0, 0)).sort((a, b) => a - b);

  // Remove duplicates
  const uniqueTimestamps = [...new Set(timestamps)];

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueTimestamps.length; i++) {
    const diff = uniqueTimestamps[i] - uniqueTimestamps[i - 1];
    const oneDay = 1000 * 60 * 60 * 24;

    // Allow +/- 2 hours for DST shifts
    if (Math.abs(diff - oneDay) < (1000 * 60 * 60 * 2)) {
      current++;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }

  return Math.max(longest, current);
};
