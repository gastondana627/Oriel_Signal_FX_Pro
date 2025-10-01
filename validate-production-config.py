#!/usr/bin/env python3
"""
Production Configuration Validator for Oriel Signal FX Pro Backend

This script validates that all required environment variables and configurations
are properly set for production deployment on Railway.

Usage:
    python validate-production-config.py
"""

import os
import sys
import json
from urllib.parse import urlparse

def print_status(message, status="INFO"):
    colors = {
        "INFO": "\033[0;34m",
        "SUCCESS": "\033[0;32m", 
        "WARNING": "\033[1;33m",
        "ERROR": "\033[0;31m",
        "NC": "\033[0m"
    }
    print(f"{colors.get(status, colors['INFO'])}[{status}]{colors['NC']} {message}")

def validate_required_vars():
    """Validate that all required environment variables are set."""
    print_status("Validating required environment variables...")
    
    required_vars = {
        'FLASK_ENV': 'Flask environment (should be "production")',
        'SECRET_KEY': 'Flask secret key for session security',
        'JWT_SECRET_KEY': 'JWT token signing key',
        'DATABASE_URL': 'PostgreSQL database connection URL',
        'REDIS_URL': 'Redis connection URL for job queue',
        'STRIPE_SECRET_KEY': 'Stripe secret key for payment processing',
        'STRIPE_PUBLISHABLE_KEY': 'Stripe publishable key',
        'STRIPE_WEBHOOK_SECRET': 'Stripe webhook endpoint secret',
        'GCS_BUCKET_NAME': 'Google Cloud Storage bucket name',
        'SENDGRID_API_KEY': 'SendGrid API key for email service',
        'SENDGRID_FROM_EMAIL': 'SendGrid sender email address',
        'ADMIN_EMAIL': 'Admin login email',
        'ADMIN_PASSWORD': 'Admin login password',
        'CORS_ORIGINS': 'Allowed CORS origins (frontend domains)',
        'FRONTEND_URL': 'Frontend application URL'
    }
    
    missing_vars = []
    weak_vars = []
    
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if not value:
            missing_vars.append(f"{var}: {description}")
        else:
            # Check for weak/default values
            if var in ['SECRET_KEY', 'JWT_SECRET_KEY'] and len(value) < 32:
                weak_vars.append(f"{var}: Should be at least 32 characters long")
            elif var == 'FLASK_ENV' and value != 'production':
                weak_vars.append(f"{var}: Should be 'production' for production deployment")
            elif var == 'ADMIN_PASSWORD' and len(value) < 12:
                weak_vars.append(f"{var}: Should be at least 12 characters long")
    
    if missing_vars:
        print_status("Missing required environment variables:", "ERROR")
        for var in missing_vars:
            print(f"  - {var}")
        return False
    
    if weak_vars:
        print_status("Weak configuration detected:", "WARNING")
        for var in weak_vars:
            print(f"  - {var}")
    
    print_status(f"All {len(required_vars)} required environment variables are set", "SUCCESS")
    return True

def validate_database_url():
    """Validate database URL format."""
    print_status("Validating database configuration...")
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print_status("DATABASE_URL not set", "ERROR")
        return False
    
    try:
        parsed = urlparse(db_url)
        if parsed.scheme not in ['postgresql', 'postgres']:
            print_status(f"Database URL should use postgresql:// scheme, got: {parsed.scheme}", "WARNING")
        
        if not parsed.hostname:
            print_status("Database URL missing hostname", "ERROR")
            return False
        
        if not parsed.port:
            print_status("Database URL missing port", "WARNING")
        
        print_status("Database URL format is valid", "SUCCESS")
        return True
        
    except Exception as e:
        print_status(f"Invalid database URL format: {e}", "ERROR")
        return False

def validate_redis_url():
    """Validate Redis URL format."""
    print_status("Validating Redis configuration...")
    
    redis_url = os.environ.get('REDIS_URL')
    if not redis_url:
        print_status("REDIS_URL not set", "ERROR")
        return False
    
    try:
        parsed = urlparse(redis_url)
        if parsed.scheme != 'redis':
            print_status(f"Redis URL should use redis:// scheme, got: {parsed.scheme}", "ERROR")
            return False
        
        if not parsed.hostname:
            print_status("Redis URL missing hostname", "ERROR")
            return False
        
        print_status("Redis URL format is valid", "SUCCESS")
        return True
        
    except Exception as e:
        print_status(f"Invalid Redis URL format: {e}", "ERROR")
        return False

def validate_stripe_config():
    """Validate Stripe configuration."""
    print_status("Validating Stripe configuration...")
    
    pub_key = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    secret_key = os.environ.get('STRIPE_SECRET_KEY', '')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    
    issues = []
    
    if not pub_key.startswith('pk_'):
        issues.append("STRIPE_PUBLISHABLE_KEY should start with 'pk_'")
    
    if not secret_key.startswith('sk_'):
        issues.append("STRIPE_SECRET_KEY should start with 'sk_'")
    
    if not webhook_secret.startswith('whsec_'):
        issues.append("STRIPE_WEBHOOK_SECRET should start with 'whsec_'")
    
    # Check if using test keys in production
    if 'test' in pub_key or 'test' in secret_key:
        issues.append("Using Stripe test keys - ensure you're using live keys for production")
    
    if issues:
        for issue in issues:
            print_status(issue, "WARNING")
    else:
        print_status("Stripe configuration looks good", "SUCCESS")
    
    return len(issues) == 0

def validate_gcs_config():
    """Validate Google Cloud Storage configuration."""
    print_status("Validating Google Cloud Storage configuration...")
    
    bucket_name = os.environ.get('GCS_BUCKET_NAME')
    credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    credentials_json = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS_JSON')
    
    if not bucket_name:
        print_status("GCS_BUCKET_NAME not set", "ERROR")
        return False
    
    if not credentials_path and not credentials_json:
        print_status("Neither GOOGLE_APPLICATION_CREDENTIALS nor GOOGLE_APPLICATION_CREDENTIALS_JSON is set", "ERROR")
        return False
    
    if credentials_json:
        try:
            json.loads(credentials_json)
            print_status("GCS credentials JSON is valid", "SUCCESS")
        except json.JSONDecodeError:
            print_status("GOOGLE_APPLICATION_CREDENTIALS_JSON contains invalid JSON", "ERROR")
            return False
    
    print_status("Google Cloud Storage configuration is valid", "SUCCESS")
    return True

def validate_email_config():
    """Validate email configuration."""
    print_status("Validating email configuration...")
    
    api_key = os.environ.get('SENDGRID_API_KEY', '')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL', '')
    
    issues = []
    
    if not api_key.startswith('SG.'):
        issues.append("SENDGRID_API_KEY should start with 'SG.'")
    
    if '@' not in from_email:
        issues.append("SENDGRID_FROM_EMAIL should be a valid email address")
    
    if issues:
        for issue in issues:
            print_status(issue, "WARNING")
        return False
    
    print_status("Email configuration is valid", "SUCCESS")
    return True

def validate_cors_config():
    """Validate CORS configuration."""
    print_status("Validating CORS configuration...")
    
    cors_origins = os.environ.get('CORS_ORIGINS', '')
    frontend_url = os.environ.get('FRONTEND_URL', '')
    
    if not cors_origins:
        print_status("CORS_ORIGINS not set", "ERROR")
        return False
    
    if not frontend_url:
        print_status("FRONTEND_URL not set", "ERROR")
        return False
    
    # Check if frontend URL is in CORS origins
    if frontend_url not in cors_origins:
        print_status("FRONTEND_URL should be included in CORS_ORIGINS", "WARNING")
    
    # Check for HTTPS in production
    if not frontend_url.startswith('https://'):
        print_status("FRONTEND_URL should use HTTPS in production", "WARNING")
    
    print_status("CORS configuration is valid", "SUCCESS")
    return True

def validate_security_config():
    """Validate security configuration."""
    print_status("Validating security configuration...")
    
    https_only = os.environ.get('HTTPS_ONLY', 'false').lower()
    flask_env = os.environ.get('FLASK_ENV', '')
    
    issues = []
    
    if flask_env == 'production' and https_only != 'true':
        issues.append("HTTPS_ONLY should be 'true' in production")
    
    if issues:
        for issue in issues:
            print_status(issue, "WARNING")
    else:
        print_status("Security configuration is valid", "SUCCESS")
    
    return len(issues) == 0

def main():
    """Main validation function."""
    print_status("Starting production configuration validation...")
    print_status("=" * 60)
    
    validations = [
        validate_required_vars,
        validate_database_url,
        validate_redis_url,
        validate_stripe_config,
        validate_gcs_config,
        validate_email_config,
        validate_cors_config,
        validate_security_config
    ]
    
    results = []
    for validation in validations:
        try:
            result = validation()
            results.append(result)
        except Exception as e:
            print_status(f"Validation error: {e}", "ERROR")
            results.append(False)
        print()  # Add spacing between validations
    
    # Summary
    print_status("=" * 60)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print_status(f"All {total} validation checks passed! ✅", "SUCCESS")
        print_status("Your configuration is ready for production deployment.", "SUCCESS")
        sys.exit(0)
    else:
        print_status(f"{passed}/{total} validation checks passed", "WARNING")
        print_status("Please fix the issues above before deploying to production.", "ERROR")
        sys.exit(1)

if __name__ == '__main__':
    main()