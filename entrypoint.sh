#!/bin/sh

# Inject the VITE_GEMINI_API_KEY into the HTML if it exists
if [ -n "$VITE_GEMINI_API_KEY" ]; then
  # Escape special characters for sed
  ESCAPED_KEY=$(echo "$VITE_GEMINI_API_KEY" | sed 's/[\/&]/\\&/g')
  
  # Create a script tag that sets the API key globally
  API_KEY_SCRIPT="<script>window.__GEMINI_API_KEY__='$ESCAPED_KEY';</script>"
  
  # Insert it into the HTML before the closing body tag
  sed -i "s|</body>|$API_KEY_SCRIPT</body>|g" /usr/share/nginx/html/index.html
fi

# Start nginx
exec nginx -g "daemon off;"
