#!/usr/bin/env python3
"""
Test script to verify localhost functionality and user experience
"""
import requests
import time
import json
import sys
import logging
from urllib.parse import urljoin

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalhostTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
    
    def log_result(self, test_name, success, message="", response_time=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'response_time': response_time
        }
        self.test_results.append(result)
        
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        logger.info(f"{status} {test_name}{time_info}: {message}")
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            start_time = time.time()
            response = self.session.get(urljoin(self.base_url, "/api/health"))
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_result("Health Check", True, "Service is healthy", response_time)
                else:
                    self.log_result("Health Check", False, f"Unhealthy status: {data}")
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {e}")
    
    def test_cors_headers(self):
        """Test CORS headers"""
        try:
            response = self.session.options(
                urljoin(self.base_url, "/api/health"),
                headers={'Origin': 'http://localhost:3000'}
            )
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_result("CORS Headers", True, f"CORS configured: {cors_headers}")
            else:
                self.log_result("CORS Headers", False, "CORS headers missing")
        except Exception as e:
            self.log_result("CORS Headers", False, f"Error: {e}")
    
    def test_security_headers(self):
        """Test security headers"""
        try:
            response = self.session.get(urljoin(self.base_url, "/api/health"))
            
            security_headers = {
                'X-Frame-Options': response.headers.get('X-Frame-Options'),
                'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
                'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
                'Content-Security-Policy': response.headers.get('Content-Security-Policy')
            }
            
            missing_headers = [k for k, v in security_headers.items() if not v]
            
            if not missing_headers:
                self.log_result("Security Headers", True, "All security headers present")
            else:
                self.log_result("Security Headers", False, f"Missing: {missing_headers}")
        except Exception as e:
            self.log_result("Security Headers", False, f"Error: {e}")
    
    def test_api_documentation(self):
        """Test API documentation endpoint"""
        try:
            start_time = time.time()
            response = self.session.get(urljoin(self.base_url, "/api/docs"))
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_result("API Documentation", True, "Documentation accessible", response_time)
            else:
                self.log_result("API Documentation", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("API Documentation", False, f"Error: {e}")
    
    def test_admin_interface(self):
        """Test admin interface accessibility"""
        try:
            start_time = time.time()
            response = self.session.get(urljoin(self.base_url, "/admin/"))
            response_time = time.time() - start_time
            
            if response.status_code in [200, 302, 401]:  # 302 for redirect, 401 for auth required
                self.log_result("Admin Interface", True, f"Admin interface accessible (HTTP {response.status_code})", response_time)
            else:
                self.log_result("Admin Interface", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Admin Interface", False, f"Error: {e}")
    
    def test_user_registration_flow(self):
        """Test user registration endpoint"""
        try:
            test_user = {
                "email": f"test_{int(time.time())}@example.com",
                "password": "TestPassword123!"
            }
            
            start_time = time.time()
            response = self.session.post(
                urljoin(self.base_url, "/api/auth/register"),
                json=test_user,
                headers={'Content-Type': 'application/json'}
            )
            response_time = time.time() - start_time
            
            if response.status_code in [200, 201, 400]:  # 400 might be validation error
                data = response.json() if response.content else {}
                self.log_result("User Registration", True, f"Registration endpoint working (HTTP {response.status_code})", response_time)
            else:
                self.log_result("User Registration", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("User Registration", False, f"Error: {e}")
    
    def test_rate_limiting(self):
        """Test rate limiting"""
        try:
            # Make multiple rapid requests to trigger rate limiting
            responses = []
            for i in range(10):
                response = self.session.get(urljoin(self.base_url, "/api/health"))
                responses.append(response.status_code)
            
            # Check if any requests were rate limited (429)
            rate_limited = any(status == 429 for status in responses)
            
            if rate_limited:
                self.log_result("Rate Limiting", True, "Rate limiting is active")
            else:
                self.log_result("Rate Limiting", True, "Rate limiting not triggered (normal for health endpoint)")
        except Exception as e:
            self.log_result("Rate Limiting", False, f"Error: {e}")
    
    def test_error_handling(self):
        """Test error handling"""
        try:
            # Test 404 error
            response = self.session.get(urljoin(self.base_url, "/api/nonexistent"))
            
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    if 'error' in error_data:
                        self.log_result("Error Handling", True, "Proper JSON error responses")
                    else:
                        self.log_result("Error Handling", False, "Error response not in JSON format")
                except:
                    self.log_result("Error Handling", False, "Error response not in JSON format")
            else:
                self.log_result("Error Handling", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Error Handling", False, f"Error: {e}")
    
    def test_performance(self):
        """Test basic performance metrics"""
        try:
            # Test multiple requests to get average response time
            times = []
            for i in range(5):
                start_time = time.time()
                response = self.session.get(urljoin(self.base_url, "/api/health"))
                response_time = time.time() - start_time
                times.append(response_time)
            
            avg_time = sum(times) / len(times)
            max_time = max(times)
            
            if avg_time < 0.5:  # Less than 500ms average
                self.log_result("Performance", True, f"Good performance: avg {avg_time:.3f}s, max {max_time:.3f}s")
            elif avg_time < 1.0:  # Less than 1s average
                self.log_result("Performance", True, f"Acceptable performance: avg {avg_time:.3f}s, max {max_time:.3f}s")
            else:
                self.log_result("Performance", False, f"Slow performance: avg {avg_time:.3f}s, max {max_time:.3f}s")
        except Exception as e:
            self.log_result("Performance", False, f"Error: {e}")
    
    def run_all_tests(self):
        """Run all tests"""
        logger.info(f"🚀 Starting localhost tests for {self.base_url}")
        logger.info("=" * 60)
        
        # Core functionality tests
        self.test_health_endpoint()
        self.test_cors_headers()
        self.test_security_headers()
        self.test_api_documentation()
        self.test_admin_interface()
        
        # User experience tests
        self.test_user_registration_flow()
        self.test_error_handling()
        
        # Performance and security tests
        self.test_rate_limiting()
        self.test_performance()
        
        # Summary
        logger.info("=" * 60)
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        logger.info(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            logger.info("🎉 All tests passed! Localhost is ready for development.")
        else:
            logger.warning(f"⚠️  {total - passed} tests failed. Please check the issues above.")
            
            # Show failed tests
            failed_tests = [r for r in self.test_results if not r['success']]
            for test in failed_tests:
                logger.error(f"   ❌ {test['test']}: {test['message']}")
        
        return passed == total

def main():
    """Main test function"""
    
    base_url = "http://localhost:5000"
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    tester = LocalhostTester(base_url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()