craee a # User Login & Reward Calculation Test Suite

This document defines specific test cases to verify User Isolation, Reward Logic, and Streak Calculations.

## 1. User Isolation (Security Test)
**Objective:** Ensure User A's reward data (points, streak) is never shown to User B.

### Test Case 1.1: Data Leakage Prevention
1.  **Pre-condition:** User A is logged in (or using the app).
2.  **Action:** User A earns 500 points.
3.  **Action:** User A logs out.
4.  **Action:** User B logs in (or a new anonymous session starts).
5.  **Expected Result:** User B sees 0 points (or their own previous data), NOT 500 points.
6.  **Technical Check:** `rewardService.ts` (Line 21) logic: `if (parsed.userId !== currentUid) ... return createDefaultState()`.

## 2. Reward Calculation Logic
**Objective:** Verify mathematical accuracy of point accumulation.

### Test Case 2.1: Daily Login Bonus
1.  **Pre-condition:** User active yesterday.
2.  **Action:** User opens app today.
3.  **Expected Result:**
    *   Streak increments by +1.
    *   Points increase by +20.
    *   Pop-up notification: "Daily Streak Kept!".

### Test Case 2.2: Broken Streak
1.  **Pre-condition:** User active 2 days ago (missed yesterday).
2.  **Action:** User opens app today.
3.  **Expected Result:**
    *   Streak resets to 1.
    *   Points increase by +20 (Login bonus).
    *   Pop-up notification: "Daily Login Bonus!".

### Test Case 2.3: Monthly Share Limit
1.  **Pre-condition:** User has NOT shared the app this month.
2.  **Action:** User clicks "Share App" (and completes share/copy).
3.  **Expected Result:**
    *   Points increase by +20.
    *   `lastSharedDate` updates to today.
4.  **Follow-up Action:** User clicks "Share App" again immediately (or any day same month).
5.  **Expected Result:**
    *   Points do NOT increase.
    *   User notified: "Daily reward limit reached" (or similar monthly message).

## 3. Leveling System
**Objective:** Verify level progression thresholds.

### Test Case 3.1: Level Up
1.  **Pre-condition:** Points = 480 (Level 1).
2.  **Action:** Earn +20 points (Total 500).
3.  **Expected Result:** Level changes from 1 -> 2.

## 4. Simulation Script (Developer Tool)
The app includes a built-in simulation tool for testing streaks without waiting days.

**How to Run:**
1.  Open Browser Console (F12).
2.  Type: `window.simulateStreak(10)`
3.  Press Enter.
4.  **Result:** App reloads, Streak = 10, Points += 200 (approx), History populated with last 10 dates.

---

## Automated Verification Logic (Console Snippet)
Copy-paste this into the browser console to verify the reward state object structure:

```javascript
const state = JSON.parse(localStorage.getItem('suman_rewards_v1'));
console.log("Current Points:", state.points);
console.log("Current Streak:", state.streak);
console.log("User ID Owner:", state.userId);
console.log("History Length:", state.activityHistory.length);

if (state.userId && state.userId !== 'CURRENT_USER_ID_HERE') {
    console.warn("⚠️ DATA LEAK RISK: Stored ID does not match session!");
} else {
    console.log("✅ Data Security Check Passed");
}
```
