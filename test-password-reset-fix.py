#!/usr/bin/env python3
"""
Test script to verify password reset functionality works correctly.
"""
import sys
import os
import requests
import json
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_password_reset_flow():
    """Test the complete password reset flow."""
    print("🔐 Testing Password Reset Flow")
    print("=" * 50)
    
    # Configuration
    base_url = "http://localhost:5000"  # Adjust if your backend runs on different port
    test_email = "test@example.com"
    
    try:
        # Step 1: Request password reset
        print(f"📧 Step 1: Requesting password reset for {test_email}")
        
        reset_request_data = {
            "email": test_email
        }
        
        response = requests.post(
            f"{base_url}/api/auth/request-password-reset",
            json=reset_request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Password reset request successful!")
            print("📧 Check your console/logs for the reset email with the reset link")
            print("\nThe email should contain a reset URL like:")
            print("http://localhost:3000/reset-password?token=<reset_token>")
            
            # Parse response
            response_data = response.json()
            print(f"\nServer Response: {response_data.get('message', 'No message')}")
            
        else:
            print(f"❌ Password reset request failed!")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw response: {response.text}")
        
        print("\n" + "=" * 50)
        print("📝 Next Steps:")
        print("1. Check your backend console/logs for the password reset email")
        print("2. Copy the reset token from the email URL")
        print("3. Use the token to reset the password via POST /api/auth/reset-password")
        print("4. Test data: {'token': '<your_token>', 'password': 'newpassword123'}")
        
        return response.status_code == 200
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure your backend server is running!")
        print("Start it with: cd backend && python oriel_backend.py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_email_service_configuration():
    """Test email service configuration."""
    print("\n🔧 Testing Email Service Configuration")
    print("=" * 50)
    
    try:
        from backend.app.email import get_email_service
        from backend.app import create_app
        
        # Create app context
        app = create_app()
        with app.app_context():
            # Get email service
            email_service = get_email_service()
            service_type = type(email_service).__name__
            
            print(f"📧 Email Service Type: {service_type}")
            
            if service_type == "ConsoleEmailService":
                print("✅ Console Email Service active (development mode)")
                print("📧 Password reset emails will be logged to console")
            elif service_type == "EmailService":
                print("✅ SendGrid Email Service active (production mode)")
                print("📧 Password reset emails will be sent via SendGrid")
            else:
                print(f"⚠️  Unknown email service type: {service_type}")
            
            # Check configuration
            sendgrid_key = app.config.get('SENDGRID_API_KEY')
            sendgrid_email = app.config.get('SENDGRID_FROM_EMAIL')
            
            print(f"\nConfiguration:")
            print(f"SENDGRID_API_KEY: {'✅ Set' if sendgrid_key else '❌ Not set'}")
            print(f"SENDGRID_FROM_EMAIL: {'✅ Set' if sendgrid_email else '❌ Not set'}")
            
            if not sendgrid_key or not sendgrid_email:
                print("\n💡 To enable real email sending:")
                print("1. Set SENDGRID_API_KEY environment variable")
                print("2. Set SENDGRID_FROM_EMAIL environment variable")
                print("3. Restart your backend server")
            
            return True
            
    except Exception as e:
        print(f"❌ Error testing email service: {e}")
        return False


def test_download_formats():
    """Test that download modal shows correct formats (MP4/MOV, no MP3)."""
    print("\n🎬 Testing Download Format Configuration")
    print("=" * 50)
    
    try:
        # Read download modal file
        with open('download-modal.js', 'r') as f:
            content = f.read()
        
        # Check for MP3 references (should not exist)
        mp3_count = content.lower().count('mp3')
        print(f"MP3 references found: {mp3_count}")
        
        if mp3_count > 0:
            print("⚠️  Warning: MP3 references still found in download modal")
        else:
            print("✅ No MP3 references found")
        
        # Check for MP4 and MOV references
        mp4_count = content.lower().count('mp4')
        mov_count = content.lower().count('mov')
        
        print(f"MP4 references found: {mp4_count}")
        print(f"MOV references found: {mov_count}")
        
        if mp4_count > 0 and mov_count > 0:
            print("✅ Both MP4 and MOV formats are available")
        else:
            print("⚠️  Warning: Missing MP4 or MOV format options")
        
        # Check for format options in HTML
        if 'data-format="mp4"' in content and 'data-format="mov"' in content:
            print("✅ Format selection options properly configured")
        else:
            print("⚠️  Warning: Format selection options may not be properly configured")
        
        return mp3_count == 0 and mp4_count > 0 and mov_count > 0
        
    except FileNotFoundError:
        print("❌ download-modal.js file not found")
        return False
    except Exception as e:
        print(f"❌ Error testing download formats: {e}")
        return False


def main():
    """Run all tests."""
    print("🧪 OrielFX Fix Verification Tests")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    results = []
    
    # Test download formats
    results.append(("Download Formats", test_download_formats()))
    
    # Test email service configuration
    results.append(("Email Service Config", test_email_service_configuration()))
    
    # Test password reset flow
    results.append(("Password Reset Flow", test_password_reset_flow()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your fixes are working correctly.")
    else:
        print("⚠️  Some tests failed. Please review the output above.")
    
    print("\n💡 Manual Testing Steps:")
    print("1. Start your backend server: cd backend && python oriel_backend.py")
    print("2. Open your frontend and try the 'Forgot Password' link")
    print("3. Check console logs for the password reset email")
    print("4. Test the download modal to see MP4/MOV options (no MP3)")


if __name__ == "__main__":
    main()