import { RewardState, RewardEvent } from '../types';

const REWARD_KEY = 'suman_rewards_v1';
const EVENT_NAME = 'REWARD_EARNED';

const getInitialState = (): RewardState => {
  try {
    const saved = localStorage.getItem(REWARD_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading rewards", e);
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

export const checkDailyStreak = () => {
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

  saveState(newState);
};

export const addPoints = (amount: number, message: string, type: RewardEvent['type']) => {
  const state = getInitialState();
  const newPoints = state.points + amount;
  const newLevel = Math.floor(newPoints / 500) + 1;

  const newState: RewardState = {
    ...state,
    points: newPoints,
    level: newLevel,
    // Update active date on any activity to ensure streak is maintained if checkDailyStreak wasn't called explicitly
    lastActiveDate: new Date().toDateString() 
  };

  saveState(newState);
  dispatchReward({ pointsAdded: amount, message, type });
};

const saveState = (state: RewardState) => {
  localStorage.setItem(REWARD_KEY, JSON.stringify(state));
  // Dispatch a generic storage event for UI updates if needed
  window.dispatchEvent(new Event('storage'));
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