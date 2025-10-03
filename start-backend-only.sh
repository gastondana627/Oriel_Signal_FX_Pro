#!/bin/bash
# Start only the backend server on port 9999 (avoiding port 8000)

echo "🚀 Starting Oriel FX Backend on port 9999..."

# Kill existing processes on ports 3000 and 9999 only (leave 8000 alone)
echo "🔄 Cleaning up ports 3000 and 9999..."
pkill -f oriel_backend 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
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
    echo "🏥 Health check: http://localhost:9999/api/health"
    echo "📧 Password reset: http://localhost:9999/api/auth/request-password-reset"
    echo "📥 Downloads: http://localhost:9999/api/downloads/check-limits"
    echo ""
    echo "Backend is ready! You can now:"
    echo "1. Test the frontend at http://127.0.0.1:3000"
    echo "2. Try password reset functionality"
    echo "3. Test download features"
    echo ""
    echo "Press Ctrl+C to stop the backend server"
else
    echo "❌ Backend failed to start properly"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Wait for interrupt
trap 'echo "🛑 Stopping backend server..."; kill $BACKEND_PID 2>/dev/null; exit 0' INT
wait