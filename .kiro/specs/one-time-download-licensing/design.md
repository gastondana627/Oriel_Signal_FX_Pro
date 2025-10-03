# One-Time Download Licensing Design

## Overview

This design implements a simplified purchase model focused on one-time downloads with automatic licensing via email. The system replaces complex subscription management with straightforward per-download purchases, making it easier for users to buy only what they need while providing clear licensing terms.

## Architecture

### Purchase Flow Architecture

```
User Request → Pricing Display → Stripe Checkout → Payment Processing → Download + Email
     ↓              ↓                ↓                 ↓                    ↓
Free Tier      Pricing Tiers    Stripe Session    Purchase Record    License Email
Validation     (Personal/       Creation          Storage            + Download Link
               Commercial/
               Premium)
```

### System Components

```
PurchaseManager
├── create_purchase_session()
├── handle_payment_success()
├── generate_download_link()
└── send_licensing_email()

LicensingService
├── generate_license_terms()
├── create_license_email()
├── track_download_usage()
└── handle_license_requests()

DownloadManager
├── create_secure_download_link()
├── validate_download_access()
├── track_download_attempts()
└── handle_link_expiration()
```

## Components and Interfaces

### 1. Purchase Management

```python
class PurchaseManager:
    def create_purchase_session(self, user_id: str, tier: str, file_id: str) -> Dict:
        # Create Stripe checkout session
        # Store pending purchase record
        # Return checkout URL and session info
        
    def handle_payment_success(self, session_id: str) -> Dict:
        # Verify payment with Stripe
        # Update purchase record
        # Generate download link
        # Trigger licensing email
        
    def get_user_purchases(self, user_id: str) -> List[Dict]:
        # Return user's purchase history
        # Include download links if still valid
        # Show licensing information
```

### 2. Pricing Tiers

```python
PRICING_TIERS = {
    'personal': {
        'price': 299,  # $2.99 in cents
        'name': 'Personal Use',
        'resolution': '1080p',
        'format': 'MP4',
        'license': 'personal_use',
        'description': 'Perfect for social media and personal projects'
    },
    'commercial': {
        'price': 999,  # $9.99 in cents
        'name': 'Commercial Use',
        'resolution': '1080p',
        'format': 'MP4',
        'license': 'commercial_use',
        'description': 'For business use, marketing, and client projects'
    },
    'premium': {
        'price': 1999,  # $19.99 in cents
        'name': 'Premium Commercial',
        'resolution': '4K',
        'format': 'MP4',
        'license': 'extended_commercial',
        'description': 'Highest quality for professional productions'
    }
}
```

### 3. Licensing Service

```python
class LicensingService:
    def generate_license_terms(self, tier: str, purchase_id: str) -> str:
        # Generate legal license text based on tier
        # Include purchase reference and terms
        # Return formatted license agreement
        
    def send_licensing_email(self, purchase_record: Dict) -> bool:
        # Create licensing email with terms
        # Include download link and receipt
        # Send via email service (console in dev)
        # Return success status
        
    def create_license_email_content(self, purchase: Dict) -> Tuple[str, str]:
        # Generate HTML and text email content
        # Include license terms, download link, receipt
        # Format for professional appearance
```

### 4. Download Management

```python
class DownloadManager:
    def create_secure_download_link(self, purchase_id: str, expires_hours: int = 48) -> str:
        # Generate signed URL with expiration
        # Include purchase validation token
        # Return secure download URL
        
    def validate_download_access(self, token: str) -> Dict:
        # Verify download token validity
        # Check expiration and attempt limits
        # Return access permission and file info
        
    def track_download_attempt(self, purchase_id: str) -> bool:
        # Log download attempt
        # Check against attempt limits (5 max)
        # Update download statistics
```

## Data Models

### Purchase Record

```python
class Purchase(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'))
    file_id = db.Column(db.String(36))  # Generated file reference
    tier = db.Column(db.String(20))  # personal, commercial, premium
    amount = db.Column(db.Integer)  # Price in cents
    stripe_session_id = db.Column(db.String(255))
    stripe_payment_intent = db.Column(db.String(255))
    status = db.Column(db.String(20))  # pending, completed, failed
    download_token = db.Column(db.String(255))  # Secure download token
    download_expires_at = db.Column(db.DateTime)
    download_attempts = db.Column(db.Integer, default=0)
    license_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
```

### Free Tier Tracking

```python
class FreeDownloadUsage(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True)
    session_id = db.Column(db.String(255))  # For anonymous users
    downloads_used = db.Column(db.Integer, default=0)
    max_downloads = db.Column(db.Integer, default=3)  # 3 for anonymous, 5 for registered
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
```

## Error Handling

### Payment Failures

1. **Stripe Checkout Errors**
   - Display user-friendly error messages
   - Log detailed error information
   - Provide retry options

2. **Payment Processing Issues**
   - Handle webhook delivery failures
   - Implement retry logic for purchase completion
   - Send manual verification emails if needed

### Download Issues

1. **Expired Links**
   - Provide re-send option via email
   - Verify original purchase before re-issuing
   - Log re-send requests for analytics

2. **File Access Problems**
   - Graceful error handling for missing files
   - Automatic retry for temporary issues
   - Customer support escalation for persistent problems

### Email Delivery

1. **Licensing Email Failures**
   - Retry up to 3 times with exponential backoff
   - Log failures for manual follow-up
   - Provide alternative access via user dashboard

## Testing Strategy

### Purchase Flow Testing

1. **Stripe Integration Tests**
   - Test checkout session creation
   - Verify webhook handling
   - Test payment success/failure scenarios

2. **Download Link Tests**
   - Test secure link generation
   - Verify expiration handling
   - Test attempt limit enforcement

3. **Email Integration Tests**
   - Test licensing email generation
   - Verify email content and formatting
   - Test email delivery in development mode

### Free Tier Testing

1. **Usage Tracking Tests**
   - Test anonymous user limits
   - Test registered user limits
   - Verify limit enforcement

2. **Upgrade Flow Tests**
   - Test transition from free to paid
   - Verify purchase prompts
   - Test user experience flow

## Implementation Notes

### Frontend Integration

```javascript
// Purchase flow integration
class PurchaseFlow {
    async initiatePurchase(tier, fileId) {
        // Create Stripe checkout session
        // Redirect to Stripe checkout
        // Handle success/cancel returns
    }
    
    async checkPurchaseStatus(sessionId) {
        // Verify purchase completion
        // Update UI with download link
        // Show licensing information
    }
}
```

### API Endpoints

```python
# New purchase endpoints
POST /api/purchases/create-session
POST /api/purchases/verify-payment
GET /api/purchases/history
POST /api/purchases/resend-license
GET /api/downloads/secure/{token}

# Updated download endpoints
GET /api/downloads/check-limits
POST /api/downloads/free-download
```

### Configuration Updates

```python
# Pricing configuration
PURCHASE_CONFIG = {
    'free_downloads_anonymous': 3,
    'free_downloads_registered': 5,
    'download_link_expiry_hours': 48,
    'max_download_attempts': 5,
    'license_email_retry_attempts': 3
}
```

This design provides a clean, user-friendly purchase experience while maintaining clear licensing terms and robust download management.