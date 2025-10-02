#!/bin/bash

echo "🚀 Starting Oriel Signal FX Pro Development Servers..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "oriel_backend" 2>/dev/null || true
pkill -f "http.server.*3000" 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 2

echo "🔧 Starting Backend Server (Port 8000)..."
cd backend
source venv/bin/activate
python oriel_backend.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

echo "🌐 Testing Backend Connection..."
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:8000"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd ..

echo "🎨 Starting Frontend Server (Port 3000)..."
python -m http.server 3000 &
FRONTEND_PID=$!

sleep 2

echo "🎉 Development servers started successfully!"
echo ""
echo "📊 Server Status:"
echo "   Backend:  http://localhost:8000 (API)"
echo "   Frontend: http://localhost:3000 (Web App)"
echo ""
echo "🔗 Open your browser to: http://localhost:3000"
echo ""
echo "To stop servers, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"

# Keep script running
wait