# Audio Visualizer SaaS Integration - Design Document

## Overview

This design document outlines the architecture and implementation approach for integrating the existing Oriel FX audio visualizer with the backend API to create a comprehensive SaaS platform. The design prioritizes seamless user experience, maintaining the current visualizer functionality while adding authentication, payments, and premium features.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   Frontend      │◄──────────────►│   Backend API   │
│   (Port 3000)   │                │   (Port 8000)   │
│                 │                │                 │
│ • Audio         │                │ • Authentication│
│   Visualizer    │                │ • User Management│
│ • Auth UI       │                │ • Payments      │
│ • User Dashboard│                │ • Usage Tracking│
│ • Payment Flow  │                │ • Analytics     │
└─────────────────┘                └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│ Local Storage   │                │   Database      │
│ • JWT Token     │                │ • Users         │
│ • User Prefs    │                │ • Payments      │
│ • Offline Cache │                │ • Usage Stats   │
└─────────────────┘                └─────────────────┘
```

### Integration Strategy

The integration follows a **progressive enhancement** approach:
1. **Core Experience**: Existing visualizer works unchanged for anonymous users
2. **Enhanced Experience**: Logged-in users get additional features and sync
3. **Premium Experience**: Paying users unlock advanced capabilities

## Components and Interfaces

### 1. Authentication Manager

**Purpose**: Handle user authentication and JWT token management

**Key Methods**:
```javascript
class AuthManager {
    async login(email, password)
    async register(email, password)
    async logout()
    isAuthenticated()
    getToken()
    refreshToken()
}
```

**Integration Points**:
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/refresh` - Token refresh
- Local storage for JWT persistence

### 2. User Interface Components

**Authentication Modals**:
```html
<!-- Login Modal -->
<div id="login-modal" class="auth-modal">
    <form id="login-form">
        <input type="email" placeholder="Email" required>
        <input type="password" placeholder="Password" required>
        <button type="submit">Login</button>
    </form>
    <p>Don't have an account? <a href="#" id="show-register">Sign up</a></p>
</div>

<!-- Register Modal -->
<div id="register-modal" class="auth-modal">
    <form id="register-form">
        <input type="email" placeholder="Email" required>
        <input type="password" placeholder="Password" required>
        <button type="submit">Create Account</button>
    </form>
</div>
```

**User Status Bar**:
```html
<div id="user-status" class="user-bar">
    <!-- Anonymous User -->
    <div id="anonymous-status">
        <span>3 free downloads remaining</span>
        <button id="login-btn">Login</button>
        <button id="register-btn">Sign Up</button>
    </div>
    
    <!-- Authenticated User -->
    <div id="authenticated-status" class="hidden">
        <span id="user-email">user@example.com</span>
        <span id="user-credits">25 credits</span>
        <button id="dashboard-btn">Dashboard</button>
        <button id="logout-btn">Logout</button>
    </div>
</div>
```

### 3. Payment Integration

**Payment Flow**:
1. User clicks "Upgrade" when limit reached
2. Frontend calls `/api/payments/create-session`
3. Redirect to Stripe Checkout
4. Return to app with success/cancel status
5. Update user credits and UI

**Payment Manager**:
```javascript
class PaymentManager {
    async createCheckoutSession(planType)
    async checkPaymentStatus(sessionId)
    async getUserCredits()
    handlePaymentSuccess()
    handlePaymentCancel()
}
```

### 4. User Dashboard

**Dashboard Sections**:
- **Account Info**: Email, join date, plan status
- **Usage Stats**: Downloads used, remaining credits
- **Payment History**: Past transactions, current plan
- **Preferences**: Saved settings, custom presets
- **Premium Features**: Access to advanced options

**Dashboard Structure**:
```html
<div id="user-dashboard" class="dashboard-modal">
    <div class="dashboard-tabs">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="usage">Usage</button>
        <button class="tab-btn" data-tab="billing">Billing</button>
        <button class="tab-btn" data-tab="settings">Settings</button>
    </div>
    
    <div class="dashboard-content">
        <div id="overview-tab" class="tab-content active">
            <!-- Account overview -->
        </div>
        <div id="usage-tab" class="tab-content">
            <!-- Usage statistics -->
        </div>
        <div id="billing-tab" class="tab-content">
            <!-- Payment history and plans -->
        </div>
        <div id="settings-tab" class="tab-content">
            <!-- User preferences -->
        </div>
    </div>
</div>
```

### 5. Usage Tracking System

**Download Tracking**:
```javascript
class UsageTracker {
    async trackDownload(type, duration)
    async getUserUsage()
    canUserDownload()
    getRemainingCredits()
    showUpgradePrompt()
}
```

**Integration with Existing Download Logic**:
- Intercept existing download functions
- Check user limits before allowing download
- Track successful downloads to backend
- Update UI with remaining credits

## Data Models

### Frontend Data Structures

**User State**:
```javascript
const userState = {
    isAuthenticated: false,
    user: {
        id: null,
        email: null,
        plan: 'free',
        credits: 0,
        preferences: {}
    },
    token: null,
    usage: {
        downloadsUsed: 0,
        downloadsLimit: 3,
        lastReset: null
    }
}
```

**App Configuration**:
```javascript
const appConfig = {
    api: {
        baseUrl: 'http://localhost:8000',
        endpoints: {
            auth: '/api/auth',
            user: '/api/user',
            payments: '/api/payments'
        }
    },
    plans: {
        free: { downloads: 3, features: ['basic'] },
        starter: { downloads: 50, features: ['basic', 'extended'] },
        pro: { downloads: 500, features: ['basic', 'extended', 'premium'] }
    }
}
```

### API Integration Points

**Authentication Endpoints**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

**User Management Endpoints**:
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/usage` - Get usage statistics
- `POST /api/user/track-download` - Track download

**Payment Endpoints**:
- `POST /api/payments/create-session` - Create Stripe session
- `GET /api/payments/status/{session_id}` - Check payment status
- `GET /api/payments/history` - Get payment history

## Error Handling

### Error Categories

1. **Network Errors**: Backend unavailable, timeout
2. **Authentication Errors**: Invalid credentials, expired token
3. **Payment Errors**: Failed payment, cancelled transaction
4. **Usage Errors**: Limit exceeded, invalid request

### Error Handling Strategy

**Graceful Degradation**:
```javascript
class ErrorHandler {
    handleNetworkError(error) {
        // Fall back to local storage mode
        this.enableOfflineMode();
        this.showNotification('Working offline - some features limited');
    }
    
    handleAuthError(error) {
        // Clear invalid token and return to anonymous mode
        this.authManager.logout();
        this.showNotification('Please log in again');
    }
    
    handleUsageError(error) {
        // Show upgrade options
        this.showUpgradeModal();
    }
}
```

**User-Friendly Messages**:
- Network issues: "Working offline - some features may be limited"
- Auth issues: "Please log in again to access your account"
- Usage limits: "You've reached your download limit. Upgrade for more!"
- Payment issues: "Payment processing failed. Please try again."

## Testing Strategy

### Unit Testing
- Authentication manager functions
- Payment flow logic
- Usage tracking calculations
- Error handling scenarios

### Integration Testing
- Frontend-backend API communication
- Authentication flow end-to-end
- Payment processing workflow
- User state synchronization

### User Experience Testing
- Anonymous user experience (current functionality)
- Registration and login flows
- Payment and upgrade process
- Dashboard functionality
- Offline mode behavior

### Performance Testing
- API response times
- Frontend rendering with auth UI
- Large user data handling
- Concurrent user scenarios

## Security Considerations

### Frontend Security
- JWT token stored securely (httpOnly cookies preferred)
- Input validation on all forms
- XSS prevention in user-generated content
- HTTPS enforcement for production

### API Security
- Rate limiting on authentication endpoints
- Input sanitization and validation
- CORS configuration for frontend domain
- Secure payment processing with Stripe

### Data Privacy
- Minimal data collection
- Clear privacy policy
- User data deletion capability
- GDPR compliance considerations

## Performance Optimization

### Frontend Optimization
- Lazy loading of dashboard components
- Efficient state management
- Minimal API calls
- Caching of user preferences

### Backend Integration
- Efficient API endpoint usage
- Batch operations where possible
- Caching of frequently accessed data
- Connection pooling and optimization

## Deployment Strategy

### Development Environment
- Frontend: `python3 -m http.server 3000`
- Backend: `python oriel_backend.py` (port 8000)
- Database: SQLite for development

### Production Environment
- Frontend: Static hosting (Netlify, Vercel)
- Backend: Railway deployment (existing setup)
- Database: PostgreSQL (Railway)
- CDN: For static assets and performance

## Migration Plan

### Phase 1: Core Integration
1. Add authentication UI components
2. Implement AuthManager class
3. Connect to backend auth endpoints
4. Test login/register flows

### Phase 2: Usage Tracking
1. Implement UsageTracker class
2. Connect download tracking to backend
3. Update UI to show usage limits
4. Test limit enforcement

### Phase 3: Payment Integration
1. Implement PaymentManager class
2. Connect to Stripe via backend
3. Add upgrade flows and UI
4. Test payment processing

### Phase 4: User Dashboard
1. Build dashboard UI components
2. Connect to user management endpoints
3. Add preferences synchronization
4. Test cross-device functionality

### Phase 5: Premium Features
1. Implement feature gating
2. Add premium visualizer options
3. Enhanced export capabilities
4. Advanced user preferences

This design provides a solid foundation for transforming the audio visualizer into a comprehensive SaaS platform while maintaining the excellent user experience of the original application.