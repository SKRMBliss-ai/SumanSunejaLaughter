#!/bin/sh

echo "--- STARTING KEY INJECTION ---"

# Check if the variable exists on the server
if [ -z "$VITE_GEMINI_API_KEY" ]; then
  echo "❌ ERROR: VITE_GEMINI_API_KEY environment variable is missing!"
else
  echo "✅ Found VITE_GEMINI_API_KEY length: ${#VITE_GEMINI_API_KEY}"
  
  # Escape special chars to prevent sed from breaking
  ESCAPED_KEY=$(echo "$VITE_GEMINI_API_KEY" | sed 's/[\/&]/\\&/g')
  
  # Inject into index.html
  sed -i "s|</head>|<script>window.__GEMINI_API_KEY__ = \"$ESCAPED_KEY\";</script></head>|g" /usr/share/nginx/html/index.html
  
  # Verify if injection happened
  if grep -q "__GEMINI_API_KEY__" /usr/share/nginx/html/index.html; then
    echo "✅ SUCCESSFULLY INJECTED KEY into index.html"
  else
    echo "❌ ERROR: Injection failed. Could not find </head> tag or write permission issue."
  fi
fi

echo "--- INJECTION COMPLETE ---"

# The script ends here. Nginx continues to start.
