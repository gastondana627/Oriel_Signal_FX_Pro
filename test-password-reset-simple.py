#!/usr/bin/env python3
"""
Simple test for password reset functionality.
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_password_reset():
    """Test password reset functionality directly."""
    print("🔐 Testing Password Reset Functionality")
    print("=" * 50)
    
    try:
        from app import create_app, db
        from app.models import User, PasswordResetToken
        from app.email import get_email_service
        from werkzeug.security import generate_password_hash
        import secrets
        from datetime import datetime, timedelta
        
        # Create app context
        app = create_app()
        with app.app_context():
            # Create tables if they don't exist
            db.create_all()
            
            # Test email
            test_email = "test@example.com"
            
            # Create or get test user
            user = User.query.filter_by(email=test_email).first()
            if not user:
                print(f"📝 Creating test user: {test_email}")
                user = User(
                    email=test_email,
                    password_hash=generate_password_hash("oldpassword123"),
                    account_type='user',
                    playlists='creative',
                    marketing_consent=True,
                    plan='free'
                )
                db.session.add(user)
                db.session.commit()
                print("✅ Test user created")
            else:
                print(f"✅ Test user exists: {test_email}")
            
            # Test email service
            print("\n📧 Testing email service...")
            email_service = get_email_service()
            print(f"Email service type: {type(email_service).__name__}")
            
            # Generate reset token
            print("\n🔑 Generating password reset token...")
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            # Invalidate existing tokens
            PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({'used': True})
            
            # Create new token
            token_record = PasswordResetToken(
                user_id=user.id,
                token=reset_token,
                expires_at=expires_at
            )
            db.session.add(token_record)
            db.session.commit()
            print(f"✅ Reset token created: {reset_token[:20]}...")
            
            # Test sending email
            print("\n📧 Sending password reset email...")
            try:
                email_result = email_service.send_password_reset_email(
                    user_email=test_email,
                    reset_token=reset_token
                )
                
                if email_result.get('success'):
                    print("✅ Password reset email sent successfully!")
                    print(f"Email service mode: {email_result.get('mode', 'unknown')}")
                    
                    if email_result.get('mode') == 'console':
                        print("\n💡 Check the console output above for the reset email content")
                        print("Look for the reset URL with the token")
                    
                else:
                    print(f"❌ Email sending failed: {email_result.get('error', 'Unknown error')}")
                    
            except Exception as email_error:
                print(f"❌ Email error: {email_error}")
            
            # Test token validation
            print(f"\n🔍 Testing token validation...")
            test_token = PasswordResetToken.query.filter_by(token=reset_token).first()
            if test_token and test_token.is_valid():
                print("✅ Token is valid and not expired")
            else:
                print("❌ Token validation failed")
            
            print(f"\n📋 Summary:")
            print(f"User: {user.email}")
            print(f"Token: {reset_token[:20]}...")
            print(f"Expires: {expires_at}")
            print(f"Reset URL: http://localhost:3000/reset-password?token={reset_token}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_password_reset_api():
    """Test the password reset API endpoint directly."""
    print("\n🌐 Testing Password Reset API")
    print("=" * 50)
    
    try:
        from app import create_app
        import json
        
        app = create_app()
        with app.test_client() as client:
            # Test password reset request
            response = client.post('/api/auth/request-password-reset', 
                                 json={'email': 'test@example.com'},
                                 headers={'Content-Type': 'application/json'})
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.get_json()}")
            
            if response.status_code == 200:
                print("✅ Password reset API works correctly!")
                return True
            else:
                print("❌ Password reset API failed")
                return False
                
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False


if __name__ == "__main__":
    print("🧪 Password Reset Test Suite")
    print("=" * 60)
    
    success1 = test_password_reset()
    success2 = test_password_reset_api()
    
    print("\n" + "=" * 60)
    print("📊 Results:")
    print(f"Direct test: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"API test: {'✅ PASS' if success2 else '❌ FAIL'}")
    
    if success1 and success2:
        print("\n🎉 Password reset functionality is working!")
        print("\n💡 To test manually:")
        print("1. Use the reset URL printed above")
        print("2. Or start your backend server and try the forgot password link")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")