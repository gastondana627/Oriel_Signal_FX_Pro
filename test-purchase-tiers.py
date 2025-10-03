#!/usr/bin/env python3
"""
Test script for purchase tiers endpoint
"""

import requests
import json
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_pricing_tiers():
    """Test the pricing tiers endpoint"""
    
    # Test the endpoint
    try:
        response = requests.get('http://localhost:8000/api/purchases/tiers')
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print("✅ Pricing tiers endpoint working!")
                print("\nAvailable tiers:")
                
                for tier_key, tier_data in data['tiers'].items():
                    print(f"\n{tier_key.upper()}:")
                    print(f"  Name: {tier_data['name']}")
                    print(f"  Price: {tier_data['formatted_price']}")
                    print(f"  Description: {tier_data['description']}")
                    print(f"  Resolution: {tier_data['resolution']}")
                    print(f"  License: {tier_data['license']}")
                    
                return True
            else:
                print(f"❌ API returned error: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server at http://localhost:8000")
        print("   Make sure the backend server is running with: python run_dev_server.py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_purchase_config():
    """Test the purchase configuration"""
    
    try:
        from app.purchases.config import PRICING_TIERS, PURCHASE_CONFIG, get_tier_info, format_price
        
        print("✅ Purchase configuration loaded successfully!")
        
        # Test tier info function
        personal_tier = get_tier_info('personal')
        if personal_tier:
            print(f"✅ Personal tier: {personal_tier['name']} - {format_price(personal_tier['price'])}")
        else:
            print("❌ Could not get personal tier info")
            return False
            
        # Test all tiers
        print(f"\n📊 Total tiers configured: {len(PRICING_TIERS)}")
        for tier_key in PRICING_TIERS:
            tier = get_tier_info(tier_key)
            print(f"  - {tier['name']}: {format_price(tier['price'])}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error testing purchase config: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Purchase System Implementation")
    print("=" * 50)
    
    # Test configuration
    print("\n1. Testing Purchase Configuration...")
    config_ok = test_purchase_config()
    
    # Test API endpoint
    print("\n2. Testing Pricing Tiers API...")
    api_ok = test_pricing_tiers()
    
    # Summary
    print("\n" + "=" * 50)
    if config_ok and api_ok:
        print("🎉 All tests passed! Purchase system is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        sys.exit(1)