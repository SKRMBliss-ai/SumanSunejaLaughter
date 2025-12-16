export enum ViewState {
  HOME = 'HOME',
  COACH = 'COACH',
  GAMES = 'GAMES',
  VIDEOS = 'VIDEOS',
  CHAT = 'CHAT',
  CONTACT = 'CONTACT',
  PROFILE = 'PROFILE'
}

export interface LaughterScore {
  score: number;
  feedback: string;
  energyLevel: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ServiceOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface RewardState {
  points: number;
  streak: number;
  lastActiveDate: string;
  level: number;
  activityHistory: string[];
  dailyPoints?: number;
  lastDailyReset?: string;
  dailyTarget?: number;
  userId?: string;
}

export interface RewardEvent {
  pointsAdded: number;
  message: string;
  type: 'STREAK' | 'GAME' | 'COACH' | 'VIDEO' | 'BONUS';
}