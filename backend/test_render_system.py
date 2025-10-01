#!/usr/bin/env python3
"""
Test script for the video rendering job system.
"""
import os
import sys
import tempfile
from io import BytesIO
from werkzeug.datastructures import FileStorage
from app.jobs.validation import validate_audio_file, validate_render_config, AudioValidationError

def test_audio_validation():
    """Test audio file validation."""
    print("Testing audio file validation...")
    
    # Test valid MP3 file simulation
    try:
        # Create a mock MP3 file with proper header
        mp3_content = b'ID3\x03\x00\x00\x00' + b'\x00' * 2000  # Mock MP3 with ID3 header
        mp3_file = FileStorage(
            stream=BytesIO(mp3_content),
            filename='test.mp3',
            content_type='audio/mpeg'
        )
        
        result = validate_audio_file(mp3_file)
        print(f"✓ Valid MP3 file validation passed: {result['filename']}")
        
    except AudioValidationError as e:
        print(f"✗ MP3 validation failed: {e}")
    except Exception as e:
        print(f"✗ Unexpected error in MP3 validation: {e}")
    
    # Test invalid file extension
    try:
        txt_file = FileStorage(
            stream=BytesIO(b'not an audio file'),
            filename='test.txt',
            content_type='text/plain'
        )
        
        validate_audio_file(txt_file)
        print("✗ Should have failed for .txt file")
        
    except AudioValidationError as e:
        print(f"✓ Correctly rejected .txt file: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test file too large
    try:
        large_content = b'ID3\x03\x00\x00\x00' + b'\x00' * (60 * 1024 * 1024)  # 60MB
        large_file = FileStorage(
            stream=BytesIO(large_content),
            filename='large.mp3',
            content_type='audio/mpeg'
        )
        
        validate_audio_file(large_file)
        print("✗ Should have failed for large file")
        
    except AudioValidationError as e:
        print(f"✓ Correctly rejected large file: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

def test_render_config_validation():
    """Test render configuration validation."""
    print("\nTesting render configuration validation...")
    
    # Test valid config
    try:
        config = {
            'resolution': '1920x1080',
            'fps': 30,
            'visualizer_type': 'bars'
        }
        result = validate_render_config(config)
        print(f"✓ Valid config validation passed")
        
    except Exception as e:
        print(f"✗ Valid config validation failed: {e}")
    
    # Test invalid resolution
    try:
        config = {'resolution': '999x999'}
        validate_render_config(config)
        print("✗ Should have failed for invalid resolution")
        
    except AudioValidationError as e:
        print(f"✓ Correctly rejected invalid resolution: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test invalid FPS
    try:
        config = {'fps': 100}
        validate_render_config(config)
        print("✗ Should have failed for invalid FPS")
        
    except AudioValidationError as e:
        print(f"✓ Correctly rejected invalid FPS: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

def main():
    """Run all tests."""
    print("Testing Video Rendering Job System")
    print("=" * 40)
    
    test_audio_validation()
    test_render_config_validation()
    
    print("\n" + "=" * 40)
    print("Test completed!")

if __name__ == '__main__':
    main()