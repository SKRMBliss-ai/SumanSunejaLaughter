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

# Install basic tools for debugging (optional but helpful)
RUN apk add --no-cache bash

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the entrypoint script
COPY entrypoint.sh /docker-entrypoint.d/40-inject-env.sh

# CRITICAL FIX: Remove Windows line endings (\r) just in case
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-inject-env.sh

# Make it executable
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
