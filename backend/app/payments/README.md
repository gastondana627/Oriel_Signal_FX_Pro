# Payment Integration Module

This module handles Stripe payment processing for the Oriel Signal FX Pro video rendering service.

## Features

- **Payment Session Creation**: Creates Stripe checkout sessions for video rendering payments
- **Payment Status Tracking**: Monitors payment status and updates database records
- **Webhook Handling**: Processes Stripe webhooks for payment confirmations
- **Error Handling**: Comprehensive error handling for Stripe API interactions
- **Payment Validation**: Validates payment amounts and configuration

## API Endpoints

### POST /api/payments/create-session
Creates a new Stripe checkout session for payment processing.

**Authentication**: JWT required

**Request Body**:
```json
{
    "amount": 2000,  // Amount in cents (required)
    "success_url": "https://example.com/success",  // Optional
    "cancel_url": "https://example.com/cancel"     // Optional
}
```

**Response**:
```json
{
    "session_id": "cs_test_...",
    "session_url": "https://checkout.stripe.com/...",
    "payment_id": 123
}
```

### GET /api/payments/status/{session_id}
Retrieves payment status for a specific Stripe session.

**Authentication**: JWT required

**Response**:
```json
{
    "payment_id": 123,
    "session_id": "cs_test_...",
    "status": "completed",
    "stripe_status": "paid",
    "amount": 2000,
    "created_at": "2023-01-01T00:00:00"
}
```

### POST /api/payments/webhook
Handles Stripe webhook events for payment processing.

**Authentication**: Stripe signature verification

**Supported Events**:
- `checkout.session.completed`: Payment successful
- `checkout.session.expired`: Payment session expired
- `payment_intent.payment_failed`: Payment failed

## Configuration

Required environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Payment Flow

1. **Frontend**: User initiates payment
2. **Backend**: Creates Stripe checkout session
3. **Stripe**: User completes payment
4. **Webhook**: Stripe notifies backend of completion
5. **Backend**: Updates payment status and triggers video rendering

## Error Handling

The module provides comprehensive error handling for:

- Invalid payment amounts (minimum 50 cents, maximum $100)
- Stripe API errors (authentication, rate limits, etc.)
- Database transaction failures
- Webhook signature verification failures

## Security Features

- JWT authentication for API endpoints
- Stripe webhook signature verification
- Input validation and sanitization
- Secure error messages (no sensitive data exposure)

## Testing

The payment integration can be tested using Stripe's test mode:

1. Set test API keys in environment variables
2. Use test card numbers from Stripe documentation
3. Webhook events can be simulated using Stripe CLI

## Dependencies

- `stripe>=13.0.0`: Stripe Python SDK
- `flask-jwt-extended`: JWT authentication
- `flask-sqlalchemy`: Database ORM