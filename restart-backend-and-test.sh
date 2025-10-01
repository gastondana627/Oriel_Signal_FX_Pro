#!/bin/bash

echo "🔄 Restarting backend with updated CORS configuration..."

# Kill any existing backend processes
echo "Stopping existing backend processes..."
pkill -f "python.*oriel_backend.py" || true
pkill -f "python.*backend" || true

# Wait a moment for processes to stop
sleep 2

# Start the backend
echo "Starting backend..."
cd backend
source venv/bin/activate
python oriel_backend.py &
BACKEND_PID=$!

echo "Backend started with PID: $BACKEND_PID"
echo "Waiting for backend to initialize..."
sleep 5

# Test the backend
echo "Testing backend health..."
curl -s http://localhost:8000/api/health | jq . || echo "Backend health check failed"

echo ""
echo "Testing CORS with 127.0.0.1:3000 origin..."
curl -s -H "Origin: http://127.0.0.1:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8000/api/auth/register

echo ""
echo "🎉 Backend restart complete!"
echo "You can now test the registration at: http://127.0.0.1:3000"
echo ""
echo "To stop the backend later, run: kill $BACKEND_PID"