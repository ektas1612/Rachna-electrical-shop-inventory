#!/bin/bash
# Rachna Electricals — Start Script (macOS)
# Double-click this file to launch the shop app.

cd "$(dirname "$0")"

echo "Starting Rachna Electricals..."
echo ""

# Activate Python venv
cd backend
source venv/bin/activate

# Start the server (foreground, so closing the window stops it)
echo "Server starting. Open http://localhost:8000 in your browser."
echo "Keep this window open while using the app."
echo ""

# Open browser after a short delay
( sleep 2 && open "http://localhost:8000" ) &

uvicorn app.main:app --host 127.0.0.1 --port 8000