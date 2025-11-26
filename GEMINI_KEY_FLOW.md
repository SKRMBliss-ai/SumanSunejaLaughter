# How Gemini API Key Flows Through the App

## 🏠 LOCAL DEVELOPMENT (Running `npm run dev`)

```
┌─────────────────────────────────────────────────────────────┐
│ Your Computer                                               │
└─────────────────────────────────────────────────────────────┘

1. You run: npm run dev
   ↓
2. Vite reads vite.config.ts
   ↓
3. Vite uses loadEnv() to look for VITE_GEMINI_API_KEY
   - Looks in: .env.local or .env
   - Not found locally? = undefined (offline mode)
   ↓
4. vite.config.ts has:
   define: {
     'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
   }
   
   This means: ANY string like "process.env.VITE_GEMINI_API_KEY" 
   in your code gets REPLACED with the actual value at BUILD time
   ↓
5. services/geminiService.ts has:
   let apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
   
   Since you don't have .env.local, apiKey = ''
   ↓
6. The app runs in OFFLINE MODE
   (No API key available)
```

**To fix locally:** Create `.env.local` with:
```
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

---

## ☁️ PRODUCTION (Cloud Run Deployment)

```
┌─────────────────────────────────────────────────────────────┐
│ Google Cloud Build Process                                  │
└─────────────────────────────────────────────────────────────┘

1. You push code to GitHub
   ↓
2. Google Cloud triggers a build:
   
   Step 1: npm install (install dependencies)
   Step 2: npm run build (build with Vite)
           - Vite reads environment
           - VITE_GEMINI_API_KEY not available at build time
           - Built files have empty API key
   Step 3: Create Docker image (production build)
   Step 4: Deploy to Cloud Run
   ↓
3. Docker Image is Built (Dockerfile):
   
   FROM node:18-alpine as build
   RUN npm install
   RUN npm run build  ← Built with EMPTY API key
   
   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY entrypoint.sh /entrypoint.sh
   ↓
4. Cloud Run Container Starts:
   - Reads environment variable: VITE_GEMINI_API_KEY
   - entrypoint.sh INJECTS it into the HTML
   
   ┌── entrypoint.sh does this: ──────────────────┐
   │                                               │
   │ if [ -n "$VITE_GEMINI_API_KEY" ]; then       │
   │   # Escape special characters                │
   │   ESCAPED_KEY=$(echo "$VITE_GEMINI_API_KEY"  │
   │     | sed 's/[\/&]/\\&/g')                   │
   │                                               │
   │   # Create a script tag                       │
   │   API_KEY_SCRIPT="<script>               │
   │     window.__GEMINI_API_KEY__='$KEY';    │
   │   </script>"                                 │
   │                                               │
   │   # Insert into HTML before </body>          │
   │   sed -i "s|</body>|$API_KEY_SCRIPT</body>|" │
   │     /usr/share/nginx/html/index.html         │
   │ fi                                           │
   │                                               │
   │ nginx -g "daemon off;"                       │
   └───────────────────────────────────────────────┘
   ↓
5. Browser receives index.html with injected script:
   
   <html>
     ...
     <body>
       <div id="root"></div>
       <script>window.__GEMINI_API_KEY__='sk-abc123...';</script>
     </body>
   </html>
   ↓
6. JavaScript loads (index.tsx → App.tsx → geminiService.ts)
   
   services/geminiService.ts:
   let apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
   if (!apiKey && typeof window !== 'undefined' && 
       (window as any).__GEMINI_API_KEY__) {
     apiKey = (window as any).__GEMINI_API_KEY__;  ← FOUND IT!
   }
   ↓
7. GoogleGenAI initialized with API key
   const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
   ↓
8. App is ONLINE ✅ (Gemini features work!)
```

---

## 📋 File-by-File Explanation

### **index.html** (Static page template)
- Just a template with placeholders
- Gets modified by entrypoint.sh at runtime in production
- Local dev: stays as-is (no API key injected)

### **vite.config.ts** (Build configuration)
```typescript
loadEnv(mode, '.', '') 
// Loads VITE_GEMINI_API_KEY from .env files

define: {
  'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
}
// Global string replacement at build time
// Every reference to 'process.env.VITE_GEMINI_API_KEY' 
// becomes the actual value (or undefined if not found)
```

### **services/geminiService.ts** (The brain)
```typescript
// Try #1: Get from build-time injection (Vite replacement)
let apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

// Try #2: Get from runtime injection (Cloud Run entrypoint.sh)
if (!apiKey && typeof window !== 'undefined' && 
    (window as any).__GEMINI_API_KEY__) {
  apiKey = (window as any).__GEMINI_API_KEY__;
}

// Initialize Gemini
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
```

### **Dockerfile** (Container template)
```dockerfile
# Build stage - creates the static files
FROM node:18-alpine as build
RUN npm build  # This runs with no VITE_GEMINI_API_KEY

# Production stage - serves the files
FROM nginx:alpine
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]  # Runs before nginx
```

### **entrypoint.sh** (Runtime injector)
```bash
#!/bin/sh
# At container startup, BEFORE nginx starts
# Reads VITE_GEMINI_API_KEY environment variable
# Injects it into index.html as window.__GEMINI_API_KEY__
# Then starts nginx to serve the modified HTML
```

### **cloudbuild.yaml** (Google Cloud automation)
```yaml
# Step 1: docker build (creates Docker image)
# Step 2: docker push (sends to registry)
# Step 3: gcloud run deploy
#   --set-env-vars=VITE_GEMINI_API_KEY=${_VITE_GEMINI_API_KEY}
#   (This env var is passed to the running container)
```

---

## 🔄 The Complete Flow Summary

| Stage | Where | API Key Source | Status |
|-------|-------|---|---|
| **Local Dev** | Your computer | `.env.local` file | ❌ Offline (no .env.local) |
| **Build** | Google Cloud | Build arguments | 🔨 Build time (not needed) |
| **Deploy** | Google Cloud | Cloud Run env vars | ⚡ Runtime injection |
| **Browser** | User's computer | `window.__GEMINI_API_KEY__` | ✅ Online |

---

## ✅ Why This Fix Works

**Before:** API key needed at BUILD time → Vite couldn't find it → Built app had no key → Offline

**After:** 
1. Build happens WITHOUT key (it's optional now)
2. Container starts with key in environment
3. entrypoint.sh injects key into HTML BEFORE nginx serves it
4. Browser JavaScript finds key in `window` object at runtime
5. Gemini API works ✅

The key insight: **We don't need the key at build time, only at runtime when the app is actually running!**
