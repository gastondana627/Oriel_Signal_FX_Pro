#!/usr/bin/env python3
"""
Test localhost on port 8000 to avoid AirPlay conflict
"""
import sys
sys.path.append('.')
from test_localhost import LocalhostTester

if __name__ == "__main__":
    print("🔍 Testing on port 8000 to avoid macOS AirPlay conflict...")
    print("🔍 Testing on port 8000 to avoid macOS AirPlay conflict...")
    tester = LocalhostTester("http://localhost:8000")
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)