#!/usr/bin/env python3
"""
Test script for CORS and frontend integration functionality
"""
import requests
import json
import sys
from datetime import datetime

def test_cors_and_api_endpoints():
    """Test CORS configuration and API endpoints"""
    
    # Base URL - adjust for your environment
    base_url = "http://localhost:5000"
    
    print("Testing CORS and Frontend Integration")
    print("=" * 50)
    
    # Test 1: Health check endpoint
    print("\n1. Testing health check endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Check CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        print(f"CORS Headers: {json.dumps(cors_headers, indent=2)}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: API info endpoint
    print("\n2. Testing API info endpoint...")
    try:
        response = requests.get(f"{base_url}/api/info")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: CORS preflight test
    print("\n3. Testing CORS preflight (OPTIONS request)...")
    try:
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
        response = requests.options(f"{base_url}/api/auth/register", headers=headers)
        print(f"Status: {response.status_code}")
        
        cors_response_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Max-Age': response.headers.get('Access-Control-Max-Age')
        }
        print(f"CORS Response Headers: {json.dumps(cors_response_headers, indent=2)}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 4: CORS test endpoint
    print("\n4. Testing dedicated CORS test endpoint...")
    try:
        headers = {
            'Origin': 'http://localhost:3000',
            'Content-Type': 'application/json'
        }
        response = requests.get(f"{base_url}/api/cors-test", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 5: Error response format
    print("\n5. Testing error response format...")
    try:
        # Try to access a protected endpoint without auth
        response = requests.get(f"{base_url}/api/user/profile")
        print(f"Status: {response.status_code}")
        print(f"Error Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 6: API documentation endpoint
    print("\n6. Testing API documentation...")
    try:
        response = requests.get(f"{base_url}/api/docs/")
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        if response.status_code == 200:
            print("API documentation is accessible")
        else:
            print("API documentation may not be properly configured")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "=" * 50)
    print("CORS and API Integration Test Complete")


if __name__ == "__main__":
    test_cors_and_api_endpoints()