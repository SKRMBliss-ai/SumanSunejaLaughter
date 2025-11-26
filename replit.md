# Suman Suneja Laughter Hub

## Overview
This is a Laughter Yoga web application built with React, TypeScript, and Vite. It provides guided laughter sessions, AI-powered chat with Suman Suneja's assistant, laughter games, video library, and more. The app uses Firebase for authentication and Google Gemini AI for intelligent features.

## Recent Changes
**Date: November 26, 2025**
- Imported from GitHub and configured for Replit environment
- Updated Vite config to use port 5000 with allowedHosts: true for Replit proxy compatibility
- Added TypeScript environment definitions for Vite (vite-env.d.ts)
- Updated .gitignore for Replit environment
- Configured workflow for development server

## Project Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (via CDN in index.html)
- **Authentication**: Firebase Auth (phone and email login)
- **AI Services**: Google Gemini 2.5 Flash
  - Chat assistant
  - Laughter rating (audio analysis)
  - Text-to-speech
  - Translation
  - Content generation

### Key Features
1. **Laughter Coach**: Guided 1-minute laughter sessions with AI-generated scripts
2. **Laughter Games**: Interactive games to rate your laughter via audio recording
3. **Video Library**: Curated laughter yoga videos
4. **Suman AI**: Chat with an AI assistant trained on Suman Suneja's expertise
5. **Profile**: User stats, daily streaks, rewards system
6. **Ambient Music**: Background relaxation music
7. **Multi-language Support**: Translation powered by Gemini AI

### Project Structure
```
├── components/          # React components for each view
│   ├── Home.tsx
│   ├── LaughterCoach.tsx
│   ├── LaughterGames.tsx
│   ├── VideoLibrary.tsx
│   ├── SumanAI.tsx
│   ├── Contact.tsx
│   ├── Login.tsx
│   ├── Profile.tsx
│   └── ...
├── services/           # Backend service integrations
│   ├── firebase.ts     # Firebase config & auth
│   ├── geminiService.ts # Gemini AI integration
│   ├── contentRepository.ts # Static content
│   └── rewardService.ts # Gamification logic
├── contexts/           # React contexts
│   └── SettingsContext.tsx
├── App.tsx             # Main app component
├── index.tsx           # App entry point
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies
```

## Environment Variables

### Required Secrets
- `VITE_GEMINI_API_KEY`: Google Gemini API key for AI features (TTS, chat, translation, laughter rating)

### Firebase Configuration
Firebase config is currently hardcoded in `services/firebase.ts` for the project `sumansunejalaughter-178eb`.

## Development

### Running Locally
1. Install dependencies: `npm install`
2. Set `VITE_GEMINI_API_KEY` environment variable
3. Run dev server: `npm run dev`
4. App runs on `http://0.0.0.0:5000`

### Port Configuration
- **Development**: Port 5000 (required for Replit webview)
- **Host**: 0.0.0.0 with allowedHosts: true for Replit proxy

## User Preferences
- No specific preferences documented yet

## Important Notes
- Phone number linking is mandatory for Gmail users after login
- Daily streak system for user engagement
- Uses localStorage for caching translations and user data
- Audio features require microphone permissions
