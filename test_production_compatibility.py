#!/usr/bin/env python3
"""
Test script to verify production compatibility before Railway deployment.
"""
import os
import sys
import subprocess
import importlib.util

def test_dependencies():
    """Test that all required dependencies are available."""
    print("🔍 Testing Python dependencies...")
    
    required_packages = [
        'flask',
        'flask_sqlalchemy',
        'flask_migrate',
        'flask_jwt_extended',
        'flask_cors',
        'flask_admin',
        'flask_limiter',
        'psycopg2_binary',
        'redis',
        'rq',
        'stripe',
        'google.cloud.storage',
        'sendgrid',
        'playwright',
        'werkzeug',
        'marshmallow',
        'python_magic',
        'gunicorn'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if '.' in package:
                # Handle nested imports like google.cloud.storage
                parts = package.split('.')
                module = __import__(parts[0])
                for part in parts[1:]:
                    module = getattr(module, part)
            else:
                __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"  ❌ {package}")
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        return False
    else:
        print("\n✅ All Python dependencies available")
        return True


def test_system_dependencies():
    """Test that system dependencies are available."""
    print("\n🔍 Testing system dependencies...")
    
    system_deps = {
        'ffmpeg': 'ffmpeg -version',
        'python': 'python --version'
    }
    
    # Only test wget on Linux (Railway environment)
    import platform
    if platform.system() == 'Linux':
        system_deps['wget'] = 'wget --version'
    
    missing_deps = []
    
    for dep, command in system_deps.items():
        try:
            result = subprocess.run(command.split(), 
                                  capture_output=True, 
                                  text=True, 
                                  timeout=10)
            if result.returncode == 0:
                print(f"  ✅ {dep}")
            else:
                missing_deps.append(dep)
                print(f"  ❌ {dep}")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            missing_deps.append(dep)
            print(f"  ❌ {dep}")
    
    if missing_deps:
        print(f"\n❌ Missing system dependencies: {', '.join(missing_deps)}")
        return False
    else:
        print("\n✅ All system dependencies available")
        return True


def test_playwright():
    """Test Playwright installation."""
    print("\n🔍 Testing Playwright...")
    
    try:
        from playwright.sync_api import sync_playwright
        
        with sync_playwright() as p:
            # Check if chromium is installed
            try:
                browser = p.chromium.launch(headless=True)
                browser.close()
                print("  ✅ Playwright Chromium working")
                return True
            except Exception as e:
                print(f"  ❌ Playwright Chromium failed: {e}")
                return False
                
    except ImportError as e:
        print(f"  ❌ Playwright import failed: {e}")
        return False


def test_flask_app():
    """Test Flask app can be imported and initialized."""
    print("\n🔍 Testing Flask app initialization...")
    
    try:
        # Add backend to path
        backend_path = os.path.join(os.path.dirname(__file__), 'backend')
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        
        # Mock magic module to avoid libmagic dependency
        import unittest.mock
        with unittest.mock.patch('magic.from_buffer', return_value='audio/mpeg'):
            from app import create_app
            
            app = create_app('testing')
            
            with app.app_context():
                print("  ✅ Flask app created successfully")
                print("  ✅ App context working")
                
                # Test blueprints are registered
                blueprint_names = [bp.name for bp in app.blueprints.values()]
                expected_blueprints = ['main', 'auth', 'jobs', 'payments', 'user', 'admin_api']
                
                missing_blueprints = [bp for bp in expected_blueprints if bp not in blueprint_names]
                if missing_blueprints:
                    print(f"  ❌ Missing blueprints: {missing_blueprints}")
                    return False
                else:
                    print("  ✅ All blueprints registered")
                
                return True
                
    except Exception as e:
        print(f"  ❌ Flask app initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_environment_config():
    """Test environment configuration."""
    print("\n🔍 Testing environment configuration...")
    
    # Check if .env.example exists
    env_example_path = os.path.join('backend', '.env.example')
    if os.path.exists(env_example_path):
        print("  ✅ .env.example exists")
        
        # Read and check required variables
        with open(env_example_path, 'r') as f:
            content = f.read()
            
        required_vars = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'ADMIN_EMAIL',
            'ADMIN_PASSWORD',
            'DATABASE_URL',
            'REDIS_URL',
            'STRIPE_SECRET_KEY',
            'GCS_BUCKET_NAME',
            'SENDGRID_API_KEY'
        ]
        
        missing_vars = []
        for var in required_vars:
            if var not in content:
                missing_vars.append(var)
            else:
                print(f"    ✅ {var}")
        
        if missing_vars:
            print(f"  ❌ Missing environment variables in .env.example: {missing_vars}")
            return False
        else:
            print("  ✅ All required environment variables documented")
            return True
    else:
        print("  ❌ .env.example not found")
        return False


def main():
    """Run all production compatibility tests."""
    print("=" * 60)
    print("🚀 PRODUCTION COMPATIBILITY TEST")
    print("=" * 60)
    
    tests = [
        ("Python Dependencies", test_dependencies),
        ("System Dependencies", test_system_dependencies),
        ("Playwright", test_playwright),
        ("Flask App", test_flask_app),
        ("Environment Config", test_environment_config)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📈 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Your environment is ready for Railway deployment!")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed")
        print("❌ Please fix the issues before deploying to Railway")
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)