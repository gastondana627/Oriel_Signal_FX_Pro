"""
Google Cloud Storage utilities for video file management.
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from google.cloud import storage
from google.cloud.exceptions import NotFound, GoogleCloudError
from flask import current_app

logger = logging.getLogger(__name__)

class GCSManager:
    """Google Cloud Storage manager for video files."""
    
    def __init__(self, bucket_name: str = None, credentials_path: str = None):
        """
        Initialize GCS manager.
        
        Args:
            bucket_name: GCS bucket name (defaults to config)
            credentials_path: Path to service account credentials (defaults to config)
        """
        self.bucket_name = bucket_name or current_app.config.get('GCS_BUCKET_NAME')
        self.credentials_path = credentials_path or current_app.config.get('GOOGLE_APPLICATION_CREDENTIALS')
        
        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME must be configured")
        
        # Initialize client
        if self.credentials_path and os.path.exists(self.credentials_path):
            self.client = storage.Client.from_service_account_json(self.credentials_path)
        else:
            # Use default credentials (for Railway deployment with service account)
            self.client = storage.Client()
        
        self.bucket = self.client.bucket(self.bucket_name)
        logger.info(f"Initialized GCS manager for bucket: {self.bucket_name}")
    
    def upload_video(self, local_file_path: str, job_id: str, user_id: int) -> str:
        """
        Upload video file to GCS.
        
        Args:
            local_file_path: Path to the local video file
            job_id: Unique job identifier
            user_id: User ID who owns the video
            
        Returns:
            str: GCS blob name/path
            
        Raises:
            GoogleCloudError: If upload fails
        """
        try:
            # Generate unique blob name
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"videos/{user_id}/{timestamp}_{job_id}.mp4"
            
            # Create blob and upload
            blob = self.bucket.blob(filename)
            
            # Set metadata
            blob.metadata = {
                'job_id': str(job_id),
                'user_id': str(user_id),
                'uploaded_at': datetime.utcnow().isoformat(),
                'content_type': 'video/mp4'
            }
            
            # Upload file
            logger.info(f"Uploading video to GCS: {filename}")
            blob.upload_from_filename(
                local_file_path,
                content_type='video/mp4'
            )
            
            logger.info(f"Successfully uploaded video: {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"Failed to upload video to GCS: {e}")
            raise GoogleCloudError(f"Upload failed: {e}")
    
    def generate_download_url(self, blob_name: str, expiration_hours: int = 24) -> str:
        """
        Generate a signed URL for downloading a video.
        
        Args:
            blob_name: GCS blob name/path
            expiration_hours: URL expiration time in hours
            
        Returns:
            str: Signed download URL
            
        Raises:
            NotFound: If blob doesn't exist
            GoogleCloudError: If URL generation fails
        """
        try:
            blob = self.bucket.blob(blob_name)
            
            # Check if blob exists
            if not blob.exists():
                raise NotFound(f"Video file not found: {blob_name}")
            
            # Generate signed URL
            expiration = datetime.utcnow() + timedelta(hours=expiration_hours)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=expiration,
                method="GET"
            )
            
            logger.info(f"Generated download URL for {blob_name}, expires in {expiration_hours}h")
            return url
            
        except NotFound:
            raise
        except Exception as e:
            logger.error(f"Failed to generate download URL: {e}")
            raise GoogleCloudError(f"URL generation failed: {e}")
    
    def delete_video(self, blob_name: str) -> bool:
        """
        Delete a video file from GCS.
        
        Args:
            blob_name: GCS blob name/path
            
        Returns:
            bool: True if deleted successfully, False if not found
            
        Raises:
            GoogleCloudError: If deletion fails
        """
        try:
            blob = self.bucket.blob(blob_name)
            
            if not blob.exists():
                logger.warning(f"Video file not found for deletion: {blob_name}")
                return False
            
            blob.delete()
            logger.info(f"Successfully deleted video: {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete video from GCS: {e}")
            raise GoogleCloudError(f"Deletion failed: {e}")
    
    def cleanup_expired_videos(self, max_age_days: int = 30) -> Tuple[int, int]:
        """
        Clean up videos older than specified age.
        
        Args:
            max_age_days: Maximum age in days before deletion
            
        Returns:
            Tuple[int, int]: (deleted_count, error_count)
        """
        deleted_count = 0
        error_count = 0
        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
        
        try:
            logger.info(f"Starting cleanup of videos older than {max_age_days} days")
            
            # List all video blobs
            blobs = self.client.list_blobs(
                self.bucket,
                prefix="videos/",
                delimiter="/"
            )
            
            for blob in blobs:
                try:
                    # Check blob age
                    if blob.time_created.replace(tzinfo=None) < cutoff_date:
                        blob.delete()
                        deleted_count += 1
                        logger.info(f"Deleted expired video: {blob.name}")
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"Failed to delete blob {blob.name}: {e}")
            
            logger.info(f"Cleanup completed: {deleted_count} deleted, {error_count} errors")
            return deleted_count, error_count
            
        except Exception as e:
            logger.error(f"Cleanup operation failed: {e}")
            raise GoogleCloudError(f"Cleanup failed: {e}")
    
    def get_video_info(self, blob_name: str) -> Optional[dict]:
        """
        Get information about a video file.
        
        Args:
            blob_name: GCS blob name/path
            
        Returns:
            dict: Video information or None if not found
        """
        try:
            blob = self.bucket.blob(blob_name)
            
            if not blob.exists():
                return None
            
            # Reload to get latest metadata
            blob.reload()
            
            return {
                'name': blob.name,
                'size': blob.size,
                'created': blob.time_created.isoformat() if blob.time_created else None,
                'updated': blob.updated.isoformat() if blob.updated else None,
                'content_type': blob.content_type,
                'metadata': blob.metadata or {},
                'etag': blob.etag
            }
            
        except Exception as e:
            logger.error(f"Failed to get video info: {e}")
            return None

def get_gcs_manager() -> GCSManager:
    """
    Get a configured GCS manager instance.
    
    Returns:
        GCSManager: Configured GCS manager
    """
    return GCSManager()