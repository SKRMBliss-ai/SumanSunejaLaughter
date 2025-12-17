# Comprehensive Testing Strategy: Suman Suneja Laughter App

This document outlines the testing strategy to ensure app stability, functionality, and localization quality screen-by-screen.

## Phase 1: Static Code Analysis & Build Integrity
**Goal:** Catch syntax errors, type mismatches, and missing dependencies before runtime.
1.  **TypeScript Compilation:** Run `tsc --noEmit` to verify strict type safety across all files.
2.  **Build Verification:** Run `npm run build` to ensure the project bundles correctly for production.
3.  **Translation Integrity:** script-check that every key in `en` exists in `nl`, `zh`, `ar`, etc., to prevent "missing key" rendering issues.

## Phase 2: Screen-by-Screen Functional Testing
**Goal:** Verify business logic and UI interactions.

### 1. Home Screen (`Home.tsx`)
*   **Initialization:** Verify user loads (Guest or Returning).
*   **Daily Logic:** Check if "Day Streak" updates correctly.
*   **Navigation:** Test all footer tabs (Videos, Games, Coach, Ask AI).
*   **Modals:** Test opening/closing of **Leaderboard** and **Rewards**.

### 2. Laughter Coach (`LaughterCoach.tsx`)
*   **Permissions:** Handle "Microphone Denied" state gracefully.
*   **Session Flow:**
    *   *Start:* Countdown logic.
    *   *Recording:* Visual feedback (waveform/bar).
    *   *Stop:* Transition to "Analyzing".
*   **Analysis:** Mock the Gemini API response to test the "Result Screen" (Score, Feedback).
*   **History:** Verify session is saved to `localStorage`/Firestore.

### 3. AI Laughter Lab (`LaughterGames.tsx`)
*   **Input Handling:** Test empty inputs for Jokes/Stories.
*   **Mode Switching:** Toggle between Story, Joke, and Mood modes.
*   **API Error Handing:** Simulate "Offline/No API Key" to ensure fallback jokes work.
*   **Audio Playback:** Ensure TTS (Text-to-Speech) triggers and stops correctly.

### 4. Video Library (`VideoLibrary.tsx`)
*   **Filtering:** Click categories (Stress Relief, Corporate) and verify list updates.
*   **Offline Mode:** Click "Save Offline", toggle "Offline Tab", verify video persists.
*   **YouTube Player:** Ensure iframe loads with correct params (modestbranding, etc.).

### 5. Settings & Localization (`SettingsContext.tsx`)
*   **Language Switch:** Switch to `nl` and `zh`. Verify immediate text update without reload.
*   **Theme Switch:** Toggle Light/Dark and Pastel/Red Brick. Verify CSS variables update.
*   **Persistence:** Reload page; ensure Language and Theme are remembered.

## Phase 3: Edge Case & Performance Testing
*   **Network Disconnect:** Simulate "Offline" (Airplane mode) and check app resilience.
*   **Empty States:** Clear `localStorage` and verify "New User" onboarding flow.
*   **Text Overflow:** Check German (`de`) and Dutch (`nl`) translations in buttons (they tend to be long).

## Execution Plan
1.  **Agent Action:** I will perform **Phase 1 (Build Check)** immediately.
2.  **Agent Action:** I will visually audit **Home** and **Leaderboard** via browser tool to confirm recent UI changes.
3.  **User Action:** You can perform the "Laughter Coach" test (requires real microphone).
