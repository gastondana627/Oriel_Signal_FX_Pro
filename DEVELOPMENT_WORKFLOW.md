# 🚀 Oriel Signal FX Pro - Development Workflow Guide

## 📋 **Quick Start Checklist**

### **Prerequisites**
- [ ] Python 3.8+ installed
- [ ] Node.js (optional, for package management)
- [ ] Git repository cloned
- [ ] Virtual environment set up

---

## 🏁 **Initial Setup (First Time Only)**

### **1. Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt
```

### **2. Database Setup**
```bash
# Still in backend directory with venv activated
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('Database created!')"
```

### **3. Test User Creation**
```bash
# Create test user (run once)
python -c "
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    # Check if user exists
    existing_user = User.query.filter_by(email='gastondana627@gmail.com').first()
    if not existing_user:
        user = User(
            email='gastondana627@gmail.com',
            password_hash=generate_password_hash('TestPassword123!'),
            is_active=True
        )
        db.session.add(user)
        db.session.commit()
        print('✅ Test user created!')
    else:
        print('✅ Test user already exists!')
"
```

---

## 🔄 **Daily Development Workflow**

### **Step 1: Start Backend Server**
```bash
# Terminal 1: Backend
cd /path/to/Oriel_Signal_FX_Pro/backend
source venv/bin/activate
python oriel_backend.py
```
**Expected Output:**
```
✅ API Client initialized
✅ Notification Manager ready
* Running on http://127.0.0.1:8000
```

### **Step 2: Start Frontend Server**
```bash
# Terminal 2: Frontend
cd /path/to/Oriel_Signal_FX_Pro
python3 -m http.server 3000
```
**Expected Output:**
```
Serving HTTP on :: port 3000 (http://[::]:3000/) ...
```

### **Step 3: Verify System Health**
```bash
# Terminal 3: Testing
cd /path/to/Oriel_Signal_FX_Pro

# Test backend health
curl http://localhost:8000/api/health

# Expected response:
# {"status": "healthy", "service": "backend-api", ...}
```

### **Step 4: Access Application**
- **Frontend**: http://127.0.0.1:3000
- **Backend API**: http://localhost:8000
- **Test Credentials**: 
  - Email: `gastondana627@gmail.com`
  - Password: `TestPassword123!`

---

## 🛠️ **Making Changes - Development Cycle**

### **Frontend Changes (HTML/CSS/JS)**
1. **Edit files** in root directory
2. **Hard refresh browser** (Cmd+Shift+R / Ctrl+Shift+R)
3. **Check console** for errors
4. **Test functionality**

### **Backend Changes (Python)**
1. **Edit files** in `backend/app/` directory
2. **Restart backend server**:
   ```bash
   # In backend terminal (Ctrl+C to stop, then restart)
   python oriel_backend.py
   ```
3. **Test API endpoints**:
   ```bash
   curl http://localhost:8000/api/health
   ```

### **Database Changes**
1. **Edit models** in `backend/app/models.py`
2. **Recreate database**:
   ```bash
   cd backend
   source venv/bin/activate
   python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.drop_all(); db.create_all(); print('Database recreated!')"
   ```
3. **Recreate test user** (use script from Initial Setup)

---

## 🧪 **Testing & Debugging**

### **Quick Health Check**
```bash
# Run this anytime to verify system status
cd /path/to/Oriel_Signal_FX_Pro

echo "🔍 Checking Backend..."
curl -s http://localhost:8000/api/health | head -1

echo "🔍 Checking Frontend..."
curl -s http://127.0.0.1:3000 | head -1

echo "🔍 Checking Processes..."
ps aux | grep -E "(oriel_backend|http.server)" | grep -v grep
```

### **Common Issues & Solutions**

#### **Backend Won't Start**
```bash
# Kill existing processes
pkill -f oriel_backend
lsof -ti:8000 | xargs kill -9

# Restart
cd backend
source venv/bin/activate
python oriel_backend.py
```

#### **Frontend Won't Load**
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9

# Restart
python3 -m http.server 3000
```

#### **Database Issues**
```bash
# Reset database completely
cd backend
source venv/bin/activate
rm -f app.db  # Remove old database
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('Database reset!')"
```

#### **Login Issues**
```bash
# Recreate test user
cd backend
source venv/bin/activate
python -c "
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    # Delete existing user
    User.query.filter_by(email='gastondana627@gmail.com').delete()
    
    # Create new user
    user = User(
        email='gastondana627@gmail.com',
        password_hash=generate_password_hash('TestPassword123!'),
        is_active=True
    )
    db.session.add(user)
    db.session.commit()
    print('✅ Test user recreated!')
"
```

---

## 🔧 **Development Tools**

### **Useful Scripts**

#### **Quick Restart Script**
```bash
# Create: restart-dev.sh
#!/bin/bash
echo "🔄 Restarting development servers..."

# Kill existing processes
pkill -f oriel_backend
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

sleep 2

# Start backend
cd backend
source venv/bin/activate
python oriel_backend.py &

# Start frontend
cd ..
python3 -m http.server 3000 &

echo "✅ Servers restarted!"
echo "Frontend: http://127.0.0.1:3000"
echo "Backend: http://localhost:8000"
```

#### **System Status Script**
```bash
# Create: check-status.sh
#!/bin/bash
echo "🔍 System Status Check"
echo "====================="

echo "Backend Health:"
curl -s http://localhost:8000/api/health | jq . 2>/dev/null || echo "❌ Backend not responding"

echo -e "\nFrontend Status:"
curl -s -I http://127.0.0.1:3000 | head -1 || echo "❌ Frontend not responding"

echo -e "\nRunning Processes:"
ps aux | grep -E "(oriel_backend|http.server)" | grep -v grep || echo "❌ No servers running"

echo -e "\nPort Usage:"
lsof -i :3000 -i :8000 2>/dev/null || echo "❌ No ports in use"
```

### **Browser Developer Tools**
- **Console**: Check for JavaScript errors
- **Network**: Monitor API calls and responses
- **Application**: Check localStorage and cookies
- **Sources**: Debug JavaScript code

---

## 📝 **Git Workflow**

### **Before Making Changes**
```bash
git status
git pull origin main
```

### **After Making Changes**
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

### **For Major Features**
```bash
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# Create pull request
```

---

## 🚨 **Emergency Procedures**

### **Complete System Reset**
```bash
# Kill all processes
pkill -f oriel_backend
pkill -f http.server
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Reset database
cd backend
rm -f app.db
source venv/bin/activate
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"

# Recreate test user
python -c "
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    user = User(
        email='gastondana627@gmail.com',
        password_hash=generate_password_hash('TestPassword123!'),
        is_active=True
    )
    db.session.add(user)
    db.session.commit()
    print('✅ System reset complete!')
"

# Restart servers
python oriel_backend.py &
cd ..
python3 -m http.server 3000 &
```

---

## 📊 **Performance Monitoring**

### **Key Metrics to Watch**
- **Backend Response Time**: < 200ms for API calls
- **Frontend Load Time**: < 2 seconds
- **Memory Usage**: Backend < 100MB
- **Error Rate**: < 1% of requests

### **Monitoring Commands**
```bash
# Monitor backend logs
tail -f backend/logs/app.log

# Monitor system resources
top -p $(pgrep -f oriel_backend)

# Monitor network requests
netstat -an | grep :8000
```

---

## 🎯 **Success Indicators**

### **System is Working When:**
- ✅ Backend health check returns `{"status": "healthy"}`
- ✅ Frontend loads without console errors
- ✅ Login works with test credentials
- ✅ Download modal appears with format options
- ✅ API calls return proper responses (not 404/500)

### **Red Flags:**
- ❌ `/undefined/api/health` errors in console
- ❌ CORS preflight failures
- ❌ 500 Internal Server Error responses
- ❌ Login button still visible after login
- ❌ Download functionality not working

---

## 📞 **Getting Help**

### **Debug Information to Collect**
1. **Console logs** (browser developer tools)
2. **Backend logs** (terminal output)
3. **Network requests** (browser network tab)
4. **System status** (running processes, ports)
5. **Recent changes** (git log)

### **Common Commands for Troubleshooting**
```bash
# Check what's running on ports
lsof -i :3000 -i :8000

# Check backend logs
cd backend && python oriel_backend.py

# Check frontend in browser
open http://127.0.0.1:3000

# Test API directly
curl -v http://localhost:8000/api/health
```

---

**Remember**: Always test after making changes, and keep both terminal windows open to monitor logs! 🚀