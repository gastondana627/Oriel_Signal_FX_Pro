# JWT Authentication System

This module implements a comprehensive JWT-based authentication system for the Oriel Signal FX Pro backend.

## Features

- User registration with email validation and password strength requirements
- Secure login with JWT token generation (access + refresh tokens)
- Password hashing using Werkzeug's security functions
- Password reset functionality with secure token generation
- Protected route middleware with JWT validation
- Token refresh mechanism
- User profile management
- Comprehensive error handling and validation

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "SecurePassword123"
}
```

**Response (201):**
```json
{
    "message": "Account created successfully",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "created_at": "2025-09-30T23:31:21.607694"
    }
}
```

#### POST `/api/auth/login`
Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
    "message": "Login successful",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "created_at": "2025-09-30T23:31:21.607694"
    }
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response (200):**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET `/api/auth/profile`
Get current user profile (protected route).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
    "user": {
        "id": 1,
        "email": "user@example.com",
        "created_at": "2025-09-30T23:31:21.607694",
        "is_active": true
    }
}
```

#### GET `/api/auth/verify`
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
    "valid": true,
    "user_id": 1,
    "email": "user@example.com"
}
```

#### POST `/api/auth/logout`
Logout user (client should discard tokens).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
    "message": "Logged out successfully"
}
```

### Password Reset Endpoints

#### POST `/api/auth/request-password-reset`
Request password reset token.

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

**Response (200):**
```json
{
    "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### POST `/api/auth/reset-password`
Reset password using token.

**Request Body:**
```json
{
    "token": "secure_reset_token_here",
    "password": "NewSecurePassword123"
}
```

**Response (200):**
```json
{
    "message": "Password reset successfully"
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- Must contain at least one letter
- Must contain at least one number

### Email Validation
- Valid email format using regex pattern
- Case-insensitive email storage

### JWT Configuration
- Access tokens expire in 1 hour
- Refresh tokens expire in 30 days
- HS256 algorithm for token signing
- Secure token generation using Flask-JWT-Extended

### Password Reset Security
- Tokens expire in 1 hour
- One-time use tokens (marked as used after reset)
- Secure token generation using `secrets.token_urlsafe(32)`
- Email enumeration protection (always returns success message)

## Error Handling

The system provides comprehensive error responses with consistent format:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable error message"
    }
}
```

### Common Error Codes

- `INVALID_REQUEST`: Malformed request body
- `MISSING_FIELDS`: Required fields not provided
- `INVALID_EMAIL`: Invalid email format
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `EMAIL_EXISTS`: Email already registered
- `INVALID_CREDENTIALS`: Wrong email/password
- `ACCOUNT_DISABLED`: User account is disabled
- `TOKEN_REQUIRED`: No authorization token provided
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_TOKEN`: JWT token is invalid
- `USER_NOT_FOUND`: User account not found

## Usage Examples

### Using the auth_required decorator

```python
from app.auth.utils import auth_required

@bp.route('/protected-endpoint')
@auth_required
def protected_route(user):
    # user object is automatically passed to the function
    return jsonify({
        'message': f'Hello {user.email}',
        'user_id': user.id
    })
```

### Getting current user in routes

```python
from app.auth.utils import get_current_user

@bp.route('/some-endpoint')
def some_route():
    user = get_current_user()
    if user:
        # User is authenticated
        return jsonify({'authenticated': True, 'user_id': user.id})
    else:
        # User is not authenticated
        return jsonify({'authenticated': False})
```

## Database Models

### User Model
- `id`: Primary key
- `email`: Unique email address (indexed)
- `password_hash`: Hashed password using Werkzeug
- `created_at`: Account creation timestamp
- `is_active`: Account status flag

### PasswordResetToken Model
- `id`: Primary key
- `user_id`: Foreign key to User
- `token`: Unique reset token
- `created_at`: Token creation timestamp
- `expires_at`: Token expiration timestamp
- `used`: Flag indicating if token has been used

## Configuration

JWT settings are configured in `config.py`:

```python
# JWT configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
JWT_ALGORITHM = 'HS256'
```

## Testing

The authentication system includes comprehensive unit tests covering:
- User registration (success, validation errors, duplicates)
- User login (success, invalid credentials, disabled accounts)
- JWT token validation and refresh
- Protected route access
- Password reset functionality
- Error handling scenarios

Run tests with:
```bash
python -m pytest app/auth/tests/ -v
```