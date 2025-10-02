#!/bin/bash
echo "🚀 Starting Oriel Signal FX Pro Backend..."

# Kill any existing backend processes
pkill -f oriel_backend 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Start the backend server
echo "✅ Starting backend on port 8000..."
python oriel_backend.py