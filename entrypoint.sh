#!/bin/sh
# Inject VITE_GEMINI_API_KEY into index.html at runtime
# This script is placed in /docker-entrypoint.d/ so Nginx runs it automatically

if [ -n "$VITE_GEMINI_API_KEY" ]; then
  # Escape special characters for sed
  ESCAPED_KEY=$(echo "$VITE_GEMINI_API_KEY" | sed 's/[\/&]/\\&/g')
  
  # Inject into </head> tag
  sed -i "s|</head>|<script>window.__GEMINI_API_KEY__ = \"$ESCAPED_KEY\";</script></head>|g" /usr/share/nginx/html/index.html
fi
