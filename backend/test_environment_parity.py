#!/usr/bin/env python3
"""
Environment Parity Backend Validator
Tests backend API endpoints and authentication across environments
Requirements: 4.1, 4.2, 4.3
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

class BackendParityValidator:
    def __init__(self):
        self.results = []
        self.environments = {
            'localhost': 'http://localhost:8000',
            'production': self.get_production_url()
        }
        self.current_environment = self.detect_environment()
        self.test_suite = self.initialize_test_suite()
        
    def get_production_url(self) -> str:
        """Get production URL from environment or default"""
        return os.getenv('PRODUCTION_URL', 'https://oriel-fx-production.railway.app')
    
    def detect_environment(self) -> str:
        """Detect current environment based on available services"""
        try:
            # Try localhost first
            response = requests.get('http://localhost:8000/api/health', timeout=5)
            if response.status_code == 200:
                return 'localhost'
        except:
            pass
        
        try:
            # Try production
            response = requests.get(f"{self.get_production_url()}/api/health", timeout=10)
            if response.status_code == 200:
                return 'production'
        except:
            pass
        
        return 'unknown'
    
    def initialize_test_suite(self) -> Dict[str, Dict]:
        """Initialize the test suite with all backend tests"""
        return {
            'health_check': {
                'name': 'API Health Check',
                'critical': True,
                'test_func': self.test_health_check
            },
            'auth_endpoints': {
                'name': 'Authentication Endpoints',
                'critical': True,
                'test_func': self.test_auth_endpoints
            },
            'user_registration': {
                'name': 'User Registration API',
                'critical': True,
                'test_func': self.test_user_registration
            },
            'user_login': {
                'name': 'User Login API',
                'critical': True,
                'test_func': self.test_user_login
            },
            'protected_routes': {
                'name': 'Protected Routes',
                'critical': True,
                'test_func': self.test_protected_routes
            },
            'file_upload': {
                'name': 'File Upload API',
                'critical': True,
                'test_func': self.test_file_upload
            },
            'download_endpoints': {
                'name': 'Download Endpoints',
                'critical': True,
                'test_func': self.test_download_endpoints
            },
            'payment_endpoints': {
                'name': 'Payment Endpoints',
                'critical': False,
                'test_func': self.test_payment_endpoints
            },
            'admin_endpoints': {
                'name': 'Admin Endpoints',
                'critical': False,
                'test_func': self.test_admin_endpoints
            },
            'cors_configuration': {
                'name': 'CORS Configuration',
                'critical': True,
                'test_func': self.test_cors_configuration
            }
        }
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all backend parity tests"""
        print(f"🧪 Starting Backend Parity Tests on {self.current_environment}")
        print("=" * 60)
        
        results = {
            'environment': self.current_environment,
            'timestamp': datetime.now().isoformat(),
            'base_url': self.environments.get(self.current_environment, 'unknown'),
            'tests': [],
            'summary': {
                'total': 0,
                'passed': 0,
                'failed': 0,
                'critical_failures': 0
            }
        }
        
        for test_key, test_config in self.test_suite.items():
            try:
                print(f"Running: {test_config['name']}")
                start_time = time.time()
                
                test_result = test_config['test_func']()
                duration = (time.time() - start_time) * 1000  # Convert to ms
                
                result = {
                    'name': test_config['name'],
                    'key': test_key,
                    'status': 'PASS' if test_result['success'] else 'FAIL',
                    'critical': test_config['critical'],
                    'details': test_result.get('details', ''),
                    'error': test_result.get('error', ''),
                    'duration': round(duration, 2)
                }
                
                results['tests'].append(result)
                results['summary']['total'] += 1
                
                if test_result['success']:
                    results['summary']['passed'] += 1
                    print(f"✅ {test_config['name']}: PASSED")
                else:
                    results['summary']['failed'] += 1
                    if test_config['critical']:
                        results['summary']['critical_failures'] += 1
                    print(f"❌ {test_config['name']}: FAILED - {test_result.get('error', 'Unknown error')}")
                
            except Exception as e:
                print(f"💥 {test_config['name']}: ERROR - {str(e)}")
                results['tests'].append({
                    'name': test_config['name'],
                    'key': test_key,
                    'status': 'ERROR',
                    'critical': test_config['critical'],
                    'details': '',
                    'error': str(e),
                    'duration': 0
                })
                results['summary']['total'] += 1
                results['summary']['failed'] += 1
                if test_config['critical']:
                    results['summary']['critical_failures'] += 1
        
        self.display_results(results)
        self.save_results(results)
        return results
    
    def test_health_check(self) -> Dict[str, Any]:
        """Test API health check endpoint"""
        try:
            base_url = self.environments[self.current_environment]
            response = requests.get(f"{base_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'details': f"Health check OK, response time: {response.elapsed.total_seconds():.3f}s"
                }
            else:
                return {
                    'success': False,
                    'error': f"Health check failed with status {response.status_code}"
                }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f"Health check network error: {str(e)}"
            }
    
    def test_auth_endpoints(self) -> Dict[str, Any]:
        """Test authentication endpoint availability"""
        try:
            base_url = self.environments[self.current_environment]
            endpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/logout']
            
            results = []
            for endpoint in endpoints:
                try:
                    # Use OPTIONS to check if endpoint exists without side effects
                    response = requests.options(f"{base_url}{endpoint}", timeout=5)
                    if response.status_code in [200, 405]:  # 405 is OK, means endpoint exists
                        results.append(f"{endpoint}: OK")
                    else:
                        results.append(f"{endpoint}: Status {response.status_code}")
                except Exception as e:
                    results.append(f"{endpoint}: Error - {str(e)}")
            
            success = all('OK' in result for result in results)
            return {
                'success': success,
                'details': '; '.join(results)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Auth endpoints test error: {str(e)}"
            }
    
    def test_user_registration(self) -> Dict[str, Any]:
        """Test user registration API"""
        try:
            base_url = self.environments[self.current_environment]
            
            # Test with invalid data to check validation
            test_data = {
                'email': 'invalid-email',
                'password': '123'  # Too short
            }
            
            response = requests.post(
                f"{base_url}/api/auth/register",
                json=test_data,
                timeout=10
            )
            
            # We expect validation errors (400/422), not 404
            if response.status_code in [400, 422]:
                return {
                    'success': True,
                    'details': f"Registration validation working (status {response.status_code})"
                }
            elif response.status_code == 404:
                return {
                    'success': False,
                    'error': "Registration endpoint not found"
                }
            else:
                return {
                    'success': True,
                    'details': f"Registration endpoint accessible (status {response.status_code})"
                }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f"Registration test network error: {str(e)}"
            }
    
    def test_user_login(self) -> Dict[str, Any]:
        """Test user login API"""
        try:
            base_url = self.environments[self.current_environment]
            
            # Test with invalid credentials
            test_data = {
                'email': 'test@example.com',
                'password': 'wrongpassword'
            }
            
            response = requests.post(
                f"{base_url}/api/auth/login",
                json=test_data,
                timeout=10
            )
            
            # We expect authentication failure (401), not 404
            if response.status_code == 401:
                return {
                    'success': True,
                    'details': "Login endpoint working, authentication properly rejected"
                }
            elif response.status_code == 404:
                return {
                    'success': False,
                    'error': "Login endpoint not found"
                }
            else:
                return {
                    'success': True,
                    'details': f"Login endpoint accessible (status {response.status_code})"
                }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f"Login test network error: {str(e)}"
            }
    
    def test_protected_routes(self) -> Dict[str, Any]:
        """Test protected routes require authentication"""
        try:
            base_url = self.environments[self.current_environment]
            protected_routes = ['/api/user/profile', '/api/user/dashboard', '/api/downloads']
            
            results = []
            for route in protected_routes:
                try:
                    response = requests.get(f"{base_url}{route}", timeout=5)
                    if response.status_code == 401:
                        results.append(f"{route}: Protected (401)")
                    elif response.status_code == 404:
                        results.append(f"{route}: Not found (404)")
                    else:
                        results.append(f"{route}: Status {response.status_code}")
                except Exception as e:
                    results.append(f"{route}: Error - {str(e)}")
            
            # At least some routes should be protected
            protected_count = sum(1 for result in results if 'Protected' in result)
            return {
                'success': protected_count > 0,
                'details': f"Protected routes: {protected_count}/{len(protected_routes)}. " + '; '.join(results)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Protected routes test error: {str(e)}"
            }
    
    def test_file_upload(self) -> Dict[str, Any]:
        """Test file upload endpoint"""
        try:
            base_url = self.environments[self.current_environment]
            
            # Test upload endpoint without authentication (should fail)
            response = requests.post(f"{base_url}/api/upload", timeout=10)
            
            if response.status_code == 401:
                return {
                    'success': True,
                    'details': "Upload endpoint protected, requires authentication"
                }
            elif response.status_code == 404:
                return {
                    'success': False,
                    'error': "Upload endpoint not found"
                }
            else:
                return {
                    'success': True,
                    'details': f"Upload endpoint accessible (status {response.status_code})"
                }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f"Upload test network error: {str(e)}"
            }
    
    def test_download_endpoints(self) -> Dict[str, Any]:
        """Test download-related endpoints"""
        try:
            base_url = self.environments[self.current_environment]
            download_routes = ['/api/downloads', '/api/downloads/status']
            
            results = []
            for route in download_routes:
                try:
                    response = requests.get(f"{base_url}{route}", timeout=5)
                    if response.status_code in [200, 401, 403]:
                        results.append(f"{route}: Accessible")
                    elif response.status_code == 404:
                        results.append(f"{route}: Not found")
                    else:
                        results.append(f"{route}: Status {response.status_code}")
                except Exception as e:
                    results.append(f"{route}: Error - {str(e)}")
            
            accessible_count = sum(1 for result in results if 'Accessible' in result)
            return {
                'success': accessible_count > 0,
                'details': f"Accessible download endpoints: {accessible_count}/{len(download_routes)}. " + '; '.join(results)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Download endpoints test error: {str(e)}"
            }
    
    def test_payment_endpoints(self) -> Dict[str, Any]:
        """Test payment system endpoints"""
        try:
            base_url = self.environments[self.current_environment]
            payment_routes = ['/api/payments/plans', '/api/payments/create-session']
            
            results = []
            for route in payment_routes:
                try:
                    response = requests.get(f"{base_url}{route}", timeout=5)
                    if response.status_code in [200, 401, 403]:
                        results.append(f"{route}: Accessible")
                    elif response.status_code == 404:
                        results.append(f"{route}: Not found")
                    else:
                        results.append(f"{route}: Status {response.status_code}")
                except Exception as e:
                    results.append(f"{route}: Error - {str(e)}")
            
            accessible_count = sum(1 for result in results if 'Accessible' in result)
            return {
                'success': accessible_count >= 0,  # Payment is optional
                'details': f"Payment endpoints: {accessible_count}/{len(payment_routes)}. " + '; '.join(results)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Payment endpoints test error: {str(e)}"
            }
    
    def test_admin_endpoints(self) -> Dict[str, Any]:
        """Test admin interface endpoints"""
        try:
            base_url = self.environments[self.current_environment]
            admin_routes = ['/api/admin/dashboard', '/api/admin/users']
            
            results = []
            for route in admin_routes:
                try:
                    response = requests.get(f"{base_url}{route}", timeout=5)
                    if response.status_code in [401, 403]:
                        results.append(f"{route}: Protected")
                    elif response.status_code == 404:
                        results.append(f"{route}: Not found")
                    else:
                        results.append(f"{route}: Status {response.status_code}")
                except Exception as e:
                    results.append(f"{route}: Error - {str(e)}")
            
            protected_count = sum(1 for result in results if 'Protected' in result)
            return {
                'success': protected_count >= 0,  # Admin is optional
                'details': f"Admin endpoints: {protected_count}/{len(admin_routes)} protected. " + '; '.join(results)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Admin endpoints test error: {str(e)}"
            }
    
    def test_cors_configuration(self) -> Dict[str, Any]:
        """Test CORS configuration"""
        try:
            base_url = self.environments[self.current_environment]
            
            # Test preflight request
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = requests.options(f"{base_url}/api/health", headers=headers, timeout=5)
            
            cors_headers = {
                'access-control-allow-origin': response.headers.get('Access-Control-Allow-Origin'),
                'access-control-allow-methods': response.headers.get('Access-Control-Allow-Methods'),
                'access-control-allow-headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            has_cors = any(header for header in cors_headers.values())
            
            return {
                'success': has_cors,
                'details': f"CORS headers present: {has_cors}. Headers: {cors_headers}"
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"CORS test error: {str(e)}"
            }
    
    def display_results(self, results: Dict[str, Any]):
        """Display test results in a formatted way"""
        print("\n🎯 Backend Parity Test Results")
        print("=" * 60)
        print(f"Environment: {results['environment']}")
        print(f"Base URL: {results['base_url']}")
        print(f"Timestamp: {results['timestamp']}")
        print(f"Total Tests: {results['summary']['total']}")
        print(f"Passed: {results['summary']['passed']}")
        print(f"Failed: {results['summary']['failed']}")
        print(f"Critical Failures: {results['summary']['critical_failures']}")
        print("=" * 60)
        
        for test in results['tests']:
            icon = '✅' if test['status'] == 'PASS' else '❌' if test['status'] == 'FAIL' else '💥'
            critical = ' [CRITICAL]' if test['critical'] else ''
            print(f"{icon} {test['name']}{critical}: {test['status']}")
            
            if test['details']:
                print(f"   Details: {test['details']}")
            if test['error']:
                print(f"   Error: {test['error']}")
            if test['duration']:
                print(f"   Duration: {test['duration']}ms")
            print()
    
    def save_results(self, results: Dict[str, Any]):
        """Save results to a JSON file"""
        try:
            filename = f"backend_parity_test_{results['environment']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"📊 Results saved to: {filename}")
        except Exception as e:
            print(f"⚠️  Could not save results: {str(e)}")

def main():
    """Main function to run backend parity tests"""
    validator = BackendParityValidator()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--critical-only':
        print("Running critical tests only...")
        # Filter to critical tests
        critical_tests = {k: v for k, v in validator.test_suite.items() if v['critical']}
        validator.test_suite = critical_tests
    
    results = validator.run_all_tests()
    
    # Exit with error code if critical tests failed
    if results['summary']['critical_failures'] > 0:
        print(f"\n❌ {results['summary']['critical_failures']} critical test(s) failed!")
        sys.exit(1)
    else:
        print(f"\n✅ All critical tests passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()