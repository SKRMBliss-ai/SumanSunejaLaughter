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
      const currentUid = auth.currentUser?.uid;

      // CRITICAL SECURITY FIX:
      // If the stored data belongs to a different user (or no user is logged in but data has ID),
      // IGNORE the local data to prevent leakage.
      if (currentUid && parsed.userId && parsed.userId !== currentUid) {
        console.warn("Detected reward data for different user. Ignoring.");
        return createDefaultState();
      }

      // Migration: Ensure activityHistory exists
      if (!parsed.activityHistory) parsed.activityHistory = [];
      return parsed;
    }
  } catch (e) {
    // Silent fail
  }
  return createDefaultState();
};

const createDefaultState = (): RewardState => ({
  points: 0,
  streak: 0,
  lastActiveDate: '',
  level: 1,
  activityHistory: [],
  dailyPoints: 0,
  lastDailyReset: new Date().toDateString(),
  dailyTarget: 50,
  userId: auth.currentUser?.uid
});

export const getRewardState = (): RewardState => {
  return getInitialState();
};

// Sync local state with Firestore when user logs in
export const syncRewardsWithFirestore = async (): Promise<boolean> => {
  const uid = getCurrentUserId();
  if (!uid) return false;

  const userRef = doc(db, 'users', uid);

  // PURGE LOCAL CACHE to ensure we are 100% relying on DB or clean state
  localStorage.removeItem(REWARD_KEY);

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
        activityHistory: data.activityHistory || [],
        dailyPoints: data.dailyPoints || 0,
        lastDailyReset: data.lastDailyReset || new Date().toDateString(),
        dailyTarget: data.dailyTarget || 50
      };

      // Update local storage with remote data
      // await saveState to ensure local storage is ready before returning
      await saveState(remoteState, false); // false = don't double sync

      // Trigger streak check NOW that we have the latest data
      await checkDailyStreak();

      return true;
    } else {
      // First time user in creating doc document
      // CRITICAL FIX: Do NOT use getInitialState() here because it might pull stale local storage data.
      // Instead, use a clean default state.
      const initialState: RewardState = {
        points: 0,
        streak: 0,
        lastActiveDate: '',
        level: 1,
        activityHistory: [],
        dailyPoints: 0,
        lastDailyReset: new Date().toDateString(),
        dailyTarget: 50
      };

      await setDoc(userRef, initialState, { merge: true });
      // Also update local storage to match this clean new state
      await saveState(initialState, false);

      // Run streak check for the new user (initializes their first day)
      await checkDailyStreak();

      return true;
    }
  } catch (error) {
    // Silent fail
    return false;
  }
};

export const resetLocalRewards = () => {
  localStorage.removeItem(REWARD_KEY);
  // Dispatch storage event to update UI immediately
  window.dispatchEvent(new Event('storage'));
};

export const checkDailyStreak = async () => {
  const state = getInitialState();
  const today = new Date().toDateString();
  const lastDate = state.lastActiveDate;

  // Ensure history exists
  const history = state.activityHistory || [];

  // Check for daily reset
  let dailyPoints = state.dailyPoints || 0;
  if (state.lastDailyReset !== today) {
    dailyPoints = 0;
  }

  // If already active today, just ensure history and daily points are saved if changed
  if (lastDate === today) {
    if (!history.includes(today)) {
      const updatedHistory = [...history, today];
      await saveState({ ...state, activityHistory: updatedHistory, dailyPoints, lastDailyReset: today });
    } else if (state.lastDailyReset !== today) {
      // Just updating the reset date if logic was somehow off
      await saveState({ ...state, dailyPoints, lastDailyReset: today });
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
  let state = getInitialState(); // Mutable mainly for re-fetching
  const today = new Date().toDateString();

  // BUG FIX: If user interacts on a new day BEFORE reloading, check streak first!
  // Otherwise, we overwrite 'lastActiveDate' and lose the streak increment/bonus.
  if (state.lastActiveDate !== today) {
    console.log("New day detected during interaction! Checking streak first...");
    await checkDailyStreak();
    // Re-fetch state because checkDailyStreak updated it (points, streak, level, etc.)
    state = getInitialState();
  }

  const newPoints = state.points + amount;
  const newLevel = Math.floor(newPoints / 500) + 1;

  // Update history
  const history = state.activityHistory || [];
  const newHistory = [...history];
  if (!newHistory.includes(today)) {
    newHistory.push(today);
  }

  // Reset daily points if new day (redundant if checkDailyStreak ran, but safe)
  let dailyPoints = state.dailyPoints || 0;
  if (state.lastDailyReset !== today) {
    dailyPoints = 0;
  }

  dailyPoints += amount;

  const newState: RewardState = {
    ...state,
    points: newPoints,
    level: newLevel,
    // Update active date on any activity to ensure streak is maintained
    lastActiveDate: today,
    activityHistory: newHistory,
    dailyPoints: dailyPoints,
    lastDailyReset: today,
    dailyTarget: state.dailyTarget // Maintain target
  };

  await saveState(newState);
  dispatchReward({ pointsAdded: amount, message, type });
};

const saveState = async (state: RewardState, syncToCloud = true) => {
  const uid = getCurrentUserId();

  // Ensure userId is attached to the state being saved
  const stateWithUser = { ...state, userId: uid };

  // 1. Save to Local Storage (Immediate UI update)
  localStorage.setItem(REWARD_KEY, JSON.stringify(stateWithUser));
  window.dispatchEvent(new Event('storage'));

  // 2. Sync to Firestore (Background)
  if (syncToCloud) {
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
          dailyPoints: state.dailyPoints || 0,
          lastDailyReset: state.lastDailyReset || new Date().toDateString(),
          dailyTarget: state.dailyTarget || 50,
          lastUpdated: new Date(),
          displayName: user?.displayName || 'Anonymous',
          photoURL: user?.photoURL || null,
          email: user?.email || null,
          uid: uid
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
