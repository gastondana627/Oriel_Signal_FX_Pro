# CORS and Frontend Integration

This document describes the CORS configuration and frontend integration features implemented for the Oriel Signal FX Pro backend.

## Features Implemented

### 1. CORS Configuration ✅

- **Flask-CORS Integration**: Properly configured with detailed settings
- **Allowed Origins**: Configurable via `CORS_ORIGINS` environment variable
- **Supported Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With
- **Credentials Support**: Enabled for authenticated requests
- **Preflight Caching**: 1 hour max-age for OPTIONS requests

#### Configuration
```python
CORS(app, 
     resources={
         r"/api/*": {
             "origins": app.config['CORS_ORIGINS'],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["X-Total-Count", "X-Page-Count"],
             "supports_credentials": True,
             "max_age": 3600
         }
     })
```

### 2. Error Response Formatting ✅

- **Consistent Format**: All API errors follow the same JSON structure
- **Error Codes**: Standardized error codes for different scenarios
- **Detailed Messages**: User-friendly error messages
- **Debug Information**: Additional details in development mode
- **HTTP Status Codes**: Proper status codes for different error types

#### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "context information"
    }
  }
}
```

#### Supported Error Types
- `400 BAD_REQUEST`: Invalid request parameters
- `401 UNAUTHORIZED`: Authentication required
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `409 CONFLICT`: Resource conflict
- `413 FILE_TOO_LARGE`: File size exceeds limit
- `415 UNSUPPORTED_MEDIA_TYPE`: Invalid file type
- `422 UNPROCESSABLE_ENTITY`: Validation errors
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded
- `500 INTERNAL_SERVER_ERROR`: Server errors

### 3. API Documentation ✅

- **Flask-RESTX Integration**: Interactive Swagger UI documentation
- **Endpoint Documentation**: All API endpoints documented
- **Request/Response Models**: Detailed schemas for all data structures
- **Authentication**: JWT Bearer token documentation
- **Error Responses**: Documented error scenarios

#### Access Points
- **Swagger UI**: `/api/docs/`
- **API Info**: `/api/info`
- **OpenAPI Spec**: `/api/swagger.json`

### 4. Health Check Endpoints ✅

- **Basic Health**: `/health` - Service health status
- **Detailed Status**: `/status` - Comprehensive system information
- **API Health**: `/api/health` - API-specific health check
- **CORS Test**: `/api/cors-test` - CORS functionality test

#### Health Check Response
```json
{
  "message": "Oriel Signal FX Pro Backend",
  "status": "healthy",
  "service": "backend-api",
  "version": "1.0.0",
  "timestamp": "2025-09-30T22:16:23.614Z",
  "environment": "development",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "external_services": {
      "stripe": "configured",
      "sendgrid": "configured",
      "gcs": "configured"
    }
  }
}
```

### 5. Frontend Integration Support ✅

- **API Information Endpoint**: `/api/info` provides endpoint discovery
- **CORS Test Endpoint**: `/api/cors-test` for testing CORS functionality
- **Consistent Response Format**: All endpoints use standardized response format
- **Error Handling**: Frontend-friendly error responses
- **Authentication Support**: JWT token handling for protected endpoints

## Configuration

### Environment Variables

```bash
# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
FRONTEND_URL=http://localhost:3000

# Other required variables
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE_URL=your-database-url
REDIS_URL=your-redis-url
```

### Development Setup

1. **Install Dependencies**:
   ```bash
   pip install flask-cors flask-restx
   ```

2. **Configure Environment**:
   ```bash
   export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   export FRONTEND_URL="http://localhost:3000"
   ```

3. **Start Development Server**:
   ```bash
   python oriel_backend.py
   ```

## Testing

### Automated Tests

Run the CORS configuration test:
```bash
python test_cors_config.py
```

### Manual Testing

1. **Open the test HTML file**: `test_frontend_integration.html`
2. **Configure the backend URL**: Default is `http://localhost:5000`
3. **Run individual tests** or **Run All Tests**
4. **Check results** for each test scenario

### Test Scenarios

1. **Health Check**: Verify service status
2. **API Info**: Check endpoint discovery
3. **CORS Test**: Validate CORS headers
4. **Error Response**: Test error formatting
5. **Authentication**: Test JWT error handling
6. **API Documentation**: Verify Swagger UI access

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint with API information |
| `/health` | GET | Health check |
| `/status` | GET | Detailed system status |
| `/api/info` | GET | API information and endpoints |
| `/api/docs/` | GET | Interactive API documentation |
| `/api/cors-test` | GET | CORS functionality test |

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/refresh` | POST | Token refresh |
| `/api/auth/reset-password` | POST | Password reset |

### Payment Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/create-session` | POST | Create payment session |
| `/api/payments/webhook` | POST | Stripe webhook handler |
| `/api/payments/status/{id}` | GET | Payment status |

### Job Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs/submit` | POST | Submit render job |
| `/api/jobs/status/{id}` | GET | Job status |
| `/api/jobs/download/{id}` | GET | Download video |
| `/api/jobs/list` | GET | List user jobs |

### User Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | User profile |
| `/api/user/history` | GET | User history |
| `/api/user/profile` | PUT | Update profile |

## Frontend Integration Examples

### JavaScript Fetch API

```javascript
// Health check
const response = await fetch('http://localhost:5000/health');
const health = await response.json();

// API call with authentication
const response = await fetch('http://localhost:5000/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Error handling
if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error.error.code, error.error.message);
}
```

### Axios Configuration

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors consistently
api.interceptors.response.use(
  response => response,
  error => {
    const apiError = error.response?.data?.error;
    if (apiError) {
      console.error('API Error:', apiError.code, apiError.message);
    }
    return Promise.reject(error);
  }
);
```

## Production Deployment

### Railway Configuration

1. **Set Environment Variables**:
   ```bash
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

2. **Update CORS Origins**: Include your production domain
3. **Enable HTTPS**: Set `HTTPS_ONLY=true` for production
4. **Configure Security Headers**: Already implemented in the app

### Security Considerations

- **CORS Origins**: Only allow trusted domains
- **HTTPS Only**: Enable in production
- **Security Headers**: Implemented (CSP, XSS protection, etc.)
- **Rate Limiting**: Configured for API endpoints
- **Input Validation**: Implemented for all endpoints
- **Error Handling**: No sensitive information exposed

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check `CORS_ORIGINS` environment variable
2. **404 on API Docs**: Ensure Flask-RESTX is installed
3. **Authentication Errors**: Verify JWT token format
4. **Health Check Fails**: Check database and Redis connections

### Debug Mode

Enable debug mode for detailed error information:
```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
```

### Logging

Check application logs for detailed error information:
```bash
tail -f backend/app.log
```

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 9.1**: CORS properly configured for frontend domain ✅
- **Requirement 9.5**: Health check endpoint for monitoring and deployment ✅
- **Additional Features**:
  - API documentation using Flask-RESTX ✅
  - Proper error response formatting ✅
  - Frontend integration testing tools ✅
  - Comprehensive CORS configuration ✅