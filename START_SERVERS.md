# 🚀 Oriel Signal FX Pro - Server Startup Guide

## Quick Start (3 Terminals Required)

### **Terminal 1: Backend Server (Port 8000)**
```bash
cd /Users/gastondana/Oriel_Signal_FX_Pro/backend
source venv/bin/activate
python oriel_backend.py
```

### **Terminal 2: Frontend Server (Port 3000)**
```bash
cd /Users/gastondana/Oriel_Signal_FX_Pro
python3 -m http.server 3000
```

### **Terminal 3: Testing/Commands**
```bash
cd /Users/gastondana/Oriel_Signal_FX_Pro
# Use this terminal for testing API calls, git commands, etc.
curl http://localhost:8000/api/health
```

## 🌐 Access URLs
- **Frontend App**: http://127.0.0.1:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/api/health

## 🔧 Troubleshooting

### If Backend Won't Start:
```bash
# Kill any existing processes
pkill -f oriel_backend
lsof -ti:8000 | xargs kill -9

# Then restart backend
cd backend
source venv/bin/activate
python oriel_backend.py
```

### If Frontend Won't Start:
```bash
# Kill any existing processes
lsof -ti:3000 | xargs kill -9

# Then restart frontend
python3 -m http.server 3000
```

### Test Credentials:
- **Email**: gastondana627@gmail.com
- **Password**: TestPassword123!

## ✅ Verification Steps:
1. Backend health check: `curl http://localhost:8000/api/health`
2. Frontend loads: Open http://127.0.0.1:3000
3. Login works with test credentials
4. Download functionality works