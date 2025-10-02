#!/bin/bash

echo "🔄 Restarting Oriel Signal FX Pro Development Servers..."
echo "=================================================="

# Kill existing processes
echo "🛑 Stopping existing servers..."
pkill -f oriel_backend 2>/dev/null
pkill -f "http.server" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

sleep 3

# Start backend
echo "🚀 Starting backend server..."
cd backend
source venv/bin/activate
python oriel_backend.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test backend
echo "🔍 Testing backend health..."
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:8000"
else
    echo "❌ Backend failed to start"
fi

# Start frontend
echo "🌐 Starting frontend server..."
cd ..
python3 -m http.server 3000 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

# Test frontend
echo "🔍 Testing frontend..."
if curl -s http://127.0.0.1:3000 > /dev/null; then
    echo "✅ Frontend is running on http://127.0.0.1:3000"
else
    echo "❌ Frontend failed to start"
fi

echo ""
echo "🎉 Development servers started!"
echo "================================"
echo "📱 Frontend: http://127.0.0.1:3000"
echo "🔧 Backend:  http://localhost:8000"
echo "🧪 System Test: http://127.0.0.1:3000/system-test.html"
echo ""
echo "🔑 Test Credentials:"
echo "   Email: gastondana627@gmail.com"
echo "   Password: TestPassword123!"
echo ""
echo "📊 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 To stop servers:"
echo "   pkill -f oriel_backend"
echo "   pkill -f http.server"
echo ""
echo "📝 Logs:"
echo "   Backend: Check terminal output"
echo "   Frontend: Check browser console"