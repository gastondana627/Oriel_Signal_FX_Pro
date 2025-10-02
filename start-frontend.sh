#!/bin/bash
echo "🌐 Starting Oriel Signal FX Pro Frontend..."

# Kill any existing frontend processes
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the frontend server
echo "✅ Starting frontend on port 3000..."
python3 -m http.server 3000