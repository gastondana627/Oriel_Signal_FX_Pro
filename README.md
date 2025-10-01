# Oriel Signal FX Pro - AI-Enhanced Video Creation Platform

A comprehensive platform for creating professional audio-reactive visualizations with AI-powered video rendering, user management, and payment processing. Built with Flask backend and Three.js frontend.

---

## 🎯 **Platform Overview**

Oriel Signal FX Pro transforms audio files into stunning visual experiences through:
- **Real-time 3D Audio Visualizations** with customizable shapes and effects
- **Professional Video Rendering** using Playwright and FFmpeg
- **User Dashboard** with profile management and render history
- **Payment Processing** via Stripe integration
- **Admin Interface** for system management and monitoring
- **Cloud Storage** with secure download links via Google Cloud Storage

---

## ✨ **Features**

### **Frontend Visualizer**
- **Real-time Audio Reactivity**: 3D shapes pulse with bass and change colors with treble
- **Customizable UI**: Interactive controls for shapes, colors, and animation intensity
- **Dynamic Shape Library**: Expandable collection of classic and procedural shapes
- **User Audio Upload**: Support for MP3 and WAV files
- **Live Preview**: Real-time visualization before rendering

### **Backend Platform** 🆕
- **User Authentication**: JWT-based auth with password reset
- **User Dashboard**: Profile management, render history, and downloads
- **Payment Processing**: Stripe integration with webhook handling
- **Video Rendering**: Automated browser-based rendering with job queue
- **Admin Interface**: Comprehensive system management dashboard
- **Cloud Storage**: Secure file storage and time-limited download links
- **Email Notifications**: SendGrid integration for user communications

### **Admin Dashboard** 🆕
- **User Management**: View, activate/deactivate user accounts
- **Payment Analytics**: Revenue tracking and transaction monitoring
- **Job Management**: Monitor, retry, and cancel render jobs
- **System Metrics**: Real-time monitoring of queues and performance
- **Health Monitoring**: System status and service health checks

---

## 🏗️ **Architecture**

### **Frontend**
- **Three.js** - 3D graphics and audio visualization
- **Web Audio API** - Real-time audio analysis
- **Vanilla JavaScript** - Lightweight and fast

### **Backend**
- **Flask** - Python web framework
- **PostgreSQL** - Primary database
- **Redis** - Job queue and caching
- **Playwright** - Headless browser for video capture
- **FFmpeg** - Video processing and encoding
- **Google Cloud Storage** - File storage and CDN
- **Stripe** - Payment processing
- **SendGrid** - Email delivery

---

## 🚀 **Quick Start**

### **Frontend Development**
```bash
# Run local development server
python3 -m http.server 8001
# Open http://localhost:8001
```

### **Backend Development**
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
flask db upgrade

# Run development server
python oriel_backend.py
```

### **Production Deployment**
```bash
# Deploy to Railway
./railway-deploy.sh

# Or manually
railway login
railway link
railway up
```

---

## 📚 **API Documentation**

### **Authentication Endpoints**
```
POST /api/auth/register     - User registration
POST /api/auth/login        - User login
POST /api/auth/refresh      - Token refresh
POST /api/auth/logout       - User logout
```

### **User Dashboard Endpoints** 🆕
```
GET  /api/user/profile      - Get user profile with statistics
PUT  /api/user/profile      - Update email/password
GET  /api/user/history      - Get payment and render history
GET  /api/user/download/<id> - Get secure download link
GET  /api/user/session/verify - Verify user session
```

### **Job Processing**
```
POST /api/jobs/submit       - Submit render job
GET  /api/jobs/<id>/status  - Check job status
GET  /api/jobs/<id>/download - Download completed video
```

### **Payment Processing**
```
POST /api/payments/create-session - Create Stripe session
POST /api/payments/webhook        - Stripe webhook handler
```

### **Admin Interface** 🆕
```
GET  /admin/                - Admin dashboard (Flask-Admin UI)
GET  /admin/api/metrics     - System metrics
GET  /admin/api/system-status - System health status
```

### **System Monitoring**
```
GET  /health               - Health check endpoint
GET  /status               - Detailed system status
```

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Admin Access
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-password

# External Services
STRIPE_SECRET_KEY=sk_...
GCS_BUCKET_NAME=your-bucket
SENDGRID_API_KEY=SG...
CORS_ORIGINS=https://yourdomain.com
```

### **Frontend Customization**
```javascript
// Customize visualization in graph.js
window.config = {
    shape: 'cube',
    size: 4,
    baseColor: 0xffffff,
    glowColor: 0x8309D5,
    pulseIntensity: 1.5,
    // ...more options
};
```

---

## 🧪 **Testing**

### **Backend Tests**
```bash
# Run all tests
python -m pytest

# Run specific test suites
python test_user_dashboard.py
python test_admin_interface.py
python test_security.py

# Production compatibility test
python test_production_compatibility.py
```

### **API Testing**
```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Test user registration
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

---

## 📊 **Monitoring & Analytics**

### **Admin Dashboard Features**
- **Real-time Metrics**: User activity, payment volume, job processing
- **System Health**: Database, Redis, and external service status
- **Job Queue Monitoring**: Queue lengths and processing times
- **Revenue Analytics**: Payment tracking and financial metrics
- **User Management**: Account status and activity monitoring

### **Health Checks**
- **Application Health**: `/health` endpoint for load balancers
- **Database Connectivity**: Automatic connection monitoring
- **External Services**: Stripe, GCS, and SendGrid status checks
- **Job Queue Status**: Redis connectivity and queue health

---

## 🔒 **Security Features**

- **JWT Authentication** with refresh token rotation
- **Rate Limiting** on all API endpoints
- **Input Validation** and sanitization
- **HTTPS Enforcement** in production
- **CORS Configuration** for frontend domains
- **Admin Role-Based Access** for management interface
- **Secure File Storage** with time-limited download links
- **Password Hashing** with werkzeug security

---

## 📈 **Performance Optimization**

- **Database Connection Pooling** for efficient resource usage
- **Redis Caching** for frequently accessed data
- **Job Queue System** for background processing
- **CDN Integration** via Google Cloud Storage
- **Optimized Docker Images** for fast deployment
- **Health Check Monitoring** for automatic recovery

---

## 🛠️ **Development Status**

### **Completed Features** ✅
- ✅ User authentication and authorization
- ✅ User dashboard with profile management
- ✅ Payment processing with Stripe
- ✅ Video rendering system with job queue
- ✅ Admin interface with system monitoring
- ✅ Cloud storage with secure downloads
- ✅ Email notifications and communications
- ✅ Production deployment configuration
- ✅ Comprehensive testing suite
- ✅ Security and rate limiting

### **Upcoming Features** 🚧
- 🚧 Frontend integration and CORS configuration
- 🚧 Enhanced error handling and recovery
- 🚧 Advanced monitoring and alerting
- 🚧 Performance optimization and caching
- 🚧 API documentation with Swagger/OpenAPI

---

## 📞 **Support & Documentation**

- **Setup Guide**: `RAILWAY_SETUP.md`
- **Deployment Guide**: `DEPLOYMENT_CHECKLIST.md`
- **Production Fixes**: `RAILWAY_PRODUCTION_FIX.md`
- **API Documentation**: Available at `/admin/` after deployment
- **System Status**: Real-time monitoring at `/admin/api/system-status`

---

## 🎉 **Getting Started**

1. **Clone the repository**
2. **Set up backend** following the Quick Start guide
3. **Configure environment variables** using `.env.example`
4. **Deploy to Railway** using `./railway-deploy.sh`
5. **Access admin dashboard** at `https://your-app.railway.app/admin/`
6. **Start creating** amazing audio-reactive videos!

---

**Built with ❤️ for creators who want to transform audio into stunning visual experiences.**