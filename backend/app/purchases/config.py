# Pricing Tiers Configuration for One-Time Download Licensing

PRICING_TIERS = {
    'personal': {
        'price': 299,  # $2.99 in cents
        'name': 'Personal Use',
        'resolution': '1080p',
        'format': 'MP4',
        'license': 'personal_use',
        'description': 'Perfect for social media and personal projects',
        'features': [
            '1080p HD quality',
            'MP4 format',
            'Personal use license',
            'Instant download'
        ]
    },
    'commercial': {
        'price': 999,  # $9.99 in cents
        'name': 'Commercial Use',
        'resolution': '1080p',
        'format': 'MP4',
        'license': 'commercial_use',
        'description': 'For business use, marketing, and client projects',
        'features': [
            '1080p HD quality',
            'MP4 format',
            'Commercial use license',
            'Instant download',
            'Business usage rights'
        ]
    },
    'premium': {
        'price': 1999,  # $19.99 in cents
        'name': 'Premium Commercial',
        'resolution': '4K',
        'format': 'MP4',
        'license': 'extended_commercial',
        'description': 'Highest quality for professional productions',
        'features': [
            '4K Ultra HD quality',
            'MP4 format',
            'Extended commercial license',
            'Instant download',
            'Professional usage rights',
            'Resale rights included'
        ]
    }
}

# Purchase configuration
PURCHASE_CONFIG = {
    'free_downloads_anonymous': 3,
    'free_downloads_registered': 5,
    'download_link_expiry_hours': 48,
    'max_download_attempts': 5,
    'license_email_retry_attempts': 3,
    'stripe_success_url': '/purchase/success',
    'stripe_cancel_url': '/purchase/cancel'
}

def get_tier_info(tier_name):
    """Get pricing tier information by name"""
    return PRICING_TIERS.get(tier_name)

def get_all_tiers():
    """Get all available pricing tiers"""
    return PRICING_TIERS

def format_price(price_cents):
    """Format price from cents to dollar string"""
    return f"${price_cents / 100:.2f}"