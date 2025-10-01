#!/usr/bin/env python3
"""
Test script for Google Cloud Storage integration.
"""
import os
import sys
import tempfile
import logging
from unittest.mock import Mock, patch

# Add the parent directory to Python path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_gcs_manager_initialization():
    """Test GCS manager initialization with mock credentials."""
    print("Testing GCS Manager initialization...")
    
    # Mock Flask app context
    with patch('backend.app.storage.gcs.current_app') as mock_app:
        mock_app.config = {
            'GCS_BUCKET_NAME': 'test-bucket',
            'GOOGLE_APPLICATION_CREDENTIALS': None
        }
        
        # Mock Google Cloud Storage client
        with patch('backend.app.storage.gcs.storage.Client') as mock_client:
            mock_bucket = Mock()
            mock_client.return_value.bucket.return_value = mock_bucket
            
            from backend.app.storage.gcs import GCSManager
            
            # Test initialization
            gcs_manager = GCSManager()
            
            assert gcs_manager.bucket_name == 'test-bucket'
            assert gcs_manager.bucket == mock_bucket
            
            print("✓ GCS Manager initialization test passed")

def test_video_upload_mock():
    """Test video upload functionality with mocked GCS."""
    print("Testing video upload with mock GCS...")
    
    with patch('app.storage.gcs.current_app') as mock_app:
        mock_app.config = {
            'GCS_BUCKET_NAME': 'test-bucket',
            'GOOGLE_APPLICATION_CREDENTIALS': None
        }
        
        with patch('app.storage.gcs.storage.Client') as mock_client:
            # Setup mock objects
            mock_blob = Mock()
            mock_bucket = Mock()
            mock_bucket.blob.return_value = mock_blob
            mock_client.return_value.bucket.return_value = mock_bucket
            
            from app.storage.gcs import GCSManager
            
            # Create a temporary test file
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                temp_file.write(b'fake video content')
                temp_file_path = temp_file.name
            
            try:
                gcs_manager = GCSManager()
                
                # Test upload
                blob_name = gcs_manager.upload_video(temp_file_path, 'test-job-123', 456)
                
                # Verify blob was configured correctly
                mock_bucket.blob.assert_called_once()
                mock_blob.upload_from_filename.assert_called_once_with(
                    temp_file_path,
                    content_type='video/mp4'
                )
                
                # Check blob name format
                assert 'videos/456/' in blob_name
                assert 'test-job-123.mp4' in blob_name
                
                print("✓ Video upload test passed")
                
            finally:
                # Cleanup
                os.unlink(temp_file_path)

def test_download_url_generation():
    """Test download URL generation with mocked GCS."""
    print("Testing download URL generation...")
    
    with patch('app.storage.gcs.current_app') as mock_app:
        mock_app.config = {
            'GCS_BUCKET_NAME': 'test-bucket',
            'GOOGLE_APPLICATION_CREDENTIALS': None
        }
        
        with patch('app.storage.gcs.storage.Client') as mock_client:
            # Setup mock objects
            mock_blob = Mock()
            mock_blob.exists.return_value = True
            mock_blob.generate_signed_url.return_value = 'https://storage.googleapis.com/test-bucket/signed-url'
            
            mock_bucket = Mock()
            mock_bucket.blob.return_value = mock_blob
            mock_client.return_value.bucket.return_value = mock_bucket
            
            from app.storage.gcs import GCSManager
            
            gcs_manager = GCSManager()
            
            # Test URL generation
            url = gcs_manager.generate_download_url('videos/123/test-video.mp4', expiration_hours=24)
            
            # Verify calls
            mock_bucket.blob.assert_called_with('videos/123/test-video.mp4')
            mock_blob.exists.assert_called_once()
            mock_blob.generate_signed_url.assert_called_once()
            
            assert url == 'https://storage.googleapis.com/test-bucket/signed-url'
            
            print("✓ Download URL generation test passed")

def test_video_cleanup():
    """Test video cleanup functionality with mocked GCS."""
    print("Testing video cleanup...")
    
    with patch('app.storage.gcs.current_app') as mock_app:
        mock_app.config = {
            'GCS_BUCKET_NAME': 'test-bucket',
            'GOOGLE_APPLICATION_CREDENTIALS': None
        }
        
        with patch('app.storage.gcs.storage.Client') as mock_client:
            # Setup mock objects
            from datetime import datetime, timedelta
            
            old_blob = Mock()
            old_blob.time_created = datetime.utcnow() - timedelta(days=35)
            old_blob.name = 'videos/123/old-video.mp4'
            
            new_blob = Mock()
            new_blob.time_created = datetime.utcnow() - timedelta(days=5)
            new_blob.name = 'videos/456/new-video.mp4'
            
            mock_client.return_value.list_blobs.return_value = [old_blob, new_blob]
            mock_bucket = Mock()
            mock_client.return_value.bucket.return_value = mock_bucket
            
            from app.storage.gcs import GCSManager
            
            gcs_manager = GCSManager()
            
            # Test cleanup (30 day threshold)
            deleted_count, error_count = gcs_manager.cleanup_expired_videos(max_age_days=30)
            
            # Verify only old blob was deleted
            old_blob.delete.assert_called_once()
            new_blob.delete.assert_not_called()
            
            assert deleted_count == 1
            assert error_count == 0
            
            print("✓ Video cleanup test passed")

def main():
    """Run all tests."""
    print("Running GCS integration tests...\n")
    
    try:
        test_gcs_manager_initialization()
        test_video_upload_mock()
        test_download_url_generation()
        test_video_cleanup()
        
        print("\n✅ All GCS integration tests passed!")
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())