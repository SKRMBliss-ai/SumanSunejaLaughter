# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build arg is optional now, but good to keep
ARG VITE_GEMINI_API_KEY=""
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# --- BULLETPROOF INJECTION SCRIPT CREATION ---
# We write the script directly here to ensure Linux compatibility
# This script will run automatically when the container starts
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'echo "--- STARTING KEY INJECTION ---"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'if [ -z "$VITE_GEMINI_API_KEY" ]; then' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  echo "❌ ERROR: VITE_GEMINI_API_KEY missing in environment"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'else' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  echo "✅ Key found. Injecting..."' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  ESCAPED_KEY=$(echo "$VITE_GEMINI_API_KEY" | sed "s/[\/&]/\\\\&/g")' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  sed -i "s|</head>|<script>window.__GEMINI_API_KEY__ = \"$ESCAPED_KEY\";</script></head>|g" /usr/share/nginx/html/index.html' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  echo "✅ Injection Complete. Key inserted into index.html"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-inject-env.sh

# Make it executable
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
