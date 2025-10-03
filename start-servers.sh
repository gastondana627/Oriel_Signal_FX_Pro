#!/bin/bash
# Oriel FX Pro - Proper Startup Script

echo "🚀 Starting Oriel FX Pro..."

# Kill existing processes
echo "🔄 Cleaning up existing processes..."
pkill -f oriel_backend 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:9999 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start backend on port 9999
echo "🔧 Starting backend server on port 9999..."
cd backend
source venv/bin/activate 2>/dev/null || echo "Virtual environment not found, using system Python"
PORT=9999 FLASK_ENV=development python oriel_backend.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test backend
echo "🔍 Testing backend connection..."
if curl -s http://localhost:9999/api/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:9999"
else
    echo "❌ Backend failed to start properly"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend on port 3000
echo "🌐 Starting frontend server on port 3000..."
cd ..
python3 -m http.server 3000 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

echo "✅ Servers started successfully!"
echo "📱 Frontend: http://127.0.0.1:3000"
echo "🔧 Backend:  http://localhost:9999"
echo "🏥 Health:   http://localhost:9999/api/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait
