# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_GEMINI_API_KEY=""
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# --- THE 100% RELIABLE INJECTION SCRIPT ---
# We write a script that creates env-config.js at runtime
# This avoids modifying index.html directly, preventing regex errors
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-generate-config.sh && \
    echo 'echo "--- GENERATING CONFIG ---"' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'FILE_PATH="/usr/share/nginx/html/env-config.js"' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'if [ -z "$VITE_GEMINI_API_KEY" ]; then' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo '  echo "window.__GEMINI_API_KEY__ = \"\";" > $FILE_PATH' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo '  echo "❌ WARNING: Key missing in environment"' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'else' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo '  echo "window.__GEMINI_API_KEY__ = \"$VITE_GEMINI_API_KEY\";" > $FILE_PATH' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo '  echo "✅ env-config.js generated successfully"' >> /docker-entrypoint.d/40-generate-config.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-generate-config.sh

# Make it executable
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
