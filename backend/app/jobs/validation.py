"""
Audio file validation utilities for render jobs.
"""
import os
import mimetypes
from werkzeug.datastructures import FileStorage
from app.security.validators import validate_file_upload, SecurityValidationError

# Allowed audio file extensions and MIME types
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'}
ALLOWED_MIME_TYPES = {
    'audio/mpeg',      # MP3
    'audio/wav',       # WAV
    'audio/x-wav',     # WAV (alternative)
    'audio/mp4',       # M4A
    'audio/aac',       # AAC
    'audio/flac',      # FLAC
    'audio/ogg',       # OGG
    'audio/vorbis'     # OGG Vorbis
}

# File size limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MIN_FILE_SIZE = 1024  # 1KB

# Duration limits (in seconds)
MAX_DURATION = 600  # 10 minutes
MIN_DURATION = 1    # 1 second


class AudioValidationError(Exception):
    """Custom exception for audio file validation errors."""
    
    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details


def validate_audio_file(file_obj):
    """
    Validate an uploaded audio file with comprehensive security checks.
    
    Args:
        file_obj: FileStorage object from Flask request
        
    Raises:
        AudioValidationError: If validation fails
        
    Returns:
        dict: Validation results with file metadata
    """
    try:
        # Use the comprehensive security validator
        allowed_types = {
            'mp3': ['audio/mpeg', 'audio/mp3'],
            'wav': ['audio/wav', 'audio/wave', 'audio/x-wav'],
            'flac': ['audio/flac', 'audio/x-flac'],
            'ogg': ['audio/ogg', 'application/ogg'],
            'm4a': ['audio/mp4', 'audio/x-m4a'],
            'aac': ['audio/aac', 'audio/x-aac']
        }
        
        result = validate_file_upload(file_obj, allowed_types)
        
        # Additional audio-specific validation
        if result['extension'] not in ALLOWED_EXTENSIONS:
            raise AudioValidationError(
                f"Unsupported file format: .{result['extension']}",
                {
                    'received_format': result['extension'],
                    'supported_formats': list(ALLOWED_EXTENSIONS)
                }
            )
        
        return result
        
    except SecurityValidationError as e:
        # Convert security validation errors to audio validation errors
        raise AudioValidationError(str(e))
    
    # Check file size
    file_obj.seek(0, os.SEEK_END)
    file_size = file_obj.tell()
    file_obj.seek(0)  # Reset file pointer
    
    if file_size < MIN_FILE_SIZE:
        raise AudioValidationError(
            f"File too small: {file_size} bytes (minimum: {MIN_FILE_SIZE} bytes)"
        )
    
    if file_size > MAX_FILE_SIZE:
        raise AudioValidationError(
            f"File too large: {file_size} bytes (maximum: {MAX_FILE_SIZE} bytes)",
            {
                'file_size': file_size,
                'max_size': MAX_FILE_SIZE,
                'max_size_mb': MAX_FILE_SIZE / (1024 * 1024)
            }
        )
    
    # Basic file content validation
    try:
        # Read first few bytes to check for valid audio file headers
        file_obj.seek(0)
        header = file_obj.read(12)
        file_obj.seek(0)  # Reset file pointer
        
        if not _is_valid_audio_header(header, file_ext):
            raise AudioValidationError(
                f"Invalid audio file format or corrupted file"
            )
            
    except Exception as e:
        if isinstance(e, AudioValidationError):
            raise
        raise AudioValidationError(f"Error reading file: {str(e)}")
    
    return {
        'filename': file_obj.filename,
        'size': file_size,
        'extension': file_ext,
        'mime_type': mime_type,
        'valid': True
    }


def _is_valid_audio_header(header_bytes, file_ext):
    """
    Check if file header matches expected audio format.
    
    Args:
        header_bytes: First 12 bytes of the file
        file_ext: File extension
        
    Returns:
        bool: True if header is valid for the format
    """
    if len(header_bytes) < 4:
        return False
    
    # MP3 files start with ID3 tag or MPEG frame sync
    if file_ext == 'mp3':
        return (
            header_bytes.startswith(b'ID3') or  # ID3 tag
            header_bytes.startswith(b'\xff\xfb') or  # MPEG frame sync
            header_bytes.startswith(b'\xff\xfa')
        )
    
    # WAV files start with RIFF header
    elif file_ext == 'wav':
        return header_bytes.startswith(b'RIFF') and b'WAVE' in header_bytes[:12]
    
    # M4A/AAC files start with ftyp box
    elif file_ext in ['m4a', 'aac']:
        return (
            b'ftyp' in header_bytes[:12] or
            header_bytes.startswith(b'\xff\xf1') or  # AAC ADTS
            header_bytes.startswith(b'\xff\xf9')
        )
    
    # FLAC files start with fLaC signature
    elif file_ext == 'flac':
        return header_bytes.startswith(b'fLaC')
    
    # OGG files start with OggS signature
    elif file_ext == 'ogg':
        return header_bytes.startswith(b'OggS')
    
    # For other formats, assume valid if we got this far
    return True


def validate_render_config(config):
    """
    Validate render configuration parameters.
    
    Args:
        config (dict): Render configuration
        
    Raises:
        AudioValidationError: If configuration is invalid
        
    Returns:
        dict: Validated and normalized configuration
    """
    if not isinstance(config, dict):
        raise AudioValidationError("Render configuration must be a dictionary")
    
    # Default configuration
    default_config = {
        'resolution': '1920x1080',
        'fps': 30,
        'duration': None,  # Will be determined from audio
        'visualizer_type': 'bars',
        'color_scheme': 'default',
        'background_color': '#000000'
    }
    
    # Merge with defaults
    validated_config = {**default_config, **config}
    
    # Validate resolution
    resolution = validated_config.get('resolution', '1920x1080')
    if not _is_valid_resolution(resolution):
        raise AudioValidationError(
            f"Invalid resolution: {resolution}",
            {
                'received_resolution': resolution,
                'supported_resolutions': ['1920x1080', '1280x720', '854x480']
            }
        )
    
    # Validate FPS
    fps = validated_config.get('fps', 30)
    if not isinstance(fps, int) or fps < 15 or fps > 60:
        raise AudioValidationError(
            f"Invalid FPS: {fps} (must be between 15 and 60)"
        )
    
    # Validate visualizer type
    visualizer_type = validated_config.get('visualizer_type', 'bars')
    valid_types = ['bars', 'waveform', 'circular', 'spectrum']
    if visualizer_type not in valid_types:
        raise AudioValidationError(
            f"Invalid visualizer type: {visualizer_type}",
            {
                'received_type': visualizer_type,
                'supported_types': valid_types
            }
        )
    
    return validated_config


def _is_valid_resolution(resolution):
    """Check if resolution string is valid."""
    valid_resolutions = ['1920x1080', '1280x720', '854x480']
    return resolution in valid_resolutions


def estimate_processing_time(file_size, duration=None):
    """
    Estimate processing time for a render job.
    
    Args:
        file_size (int): Audio file size in bytes
        duration (float): Audio duration in seconds (optional)
        
    Returns:
        int: Estimated processing time in seconds
    """
    # Base processing time (30 seconds minimum)
    base_time = 30
    
    # Add time based on file size (1 second per MB)
    size_factor = file_size / (1024 * 1024)
    
    # Add time based on duration if available (2x real-time)
    duration_factor = (duration * 2) if duration else 0
    
    # Total estimate
    estimated_time = base_time + size_factor + duration_factor
    
    # Cap at reasonable maximum (10 minutes)
    return min(int(estimated_time), 600)


def validate_render_request(request_data):
    """
    Validate a complete render request.
    
    Args:
        request_data: Dictionary containing render request data
        
    Returns:
        bool: True if valid
        
    Raises:
        ValueError: If validation fails
    """
    required_fields = ['audio_file', 'visualizer_type', 'color_scheme', 'background']
    
    for field in required_fields:
        if field not in request_data:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate visualizer type
    valid_visualizer_types = ['bars', 'waveform', 'circular', 'spectrum']
    if request_data['visualizer_type'] not in valid_visualizer_types:
        raise ValueError(f"Invalid visualizer type: {request_data['visualizer_type']}")
    
    # Validate duration if provided
    if 'duration' in request_data:
        duration = request_data['duration']
        if not isinstance(duration, (int, float)) or duration <= 0:
            raise ValueError("Duration must be a positive number")
        if duration > MAX_DURATION:
            raise ValueError(f"Duration exceeds maximum allowed ({MAX_DURATION} seconds)")
    
    return True


def sanitize_filename(filename):
    """
    Sanitize a filename to prevent path traversal and other security issues.
    
    Args:
        filename: Original filename
        
    Returns:
        str: Sanitized filename
    """
    import re
    import os
    
    if not filename:
        return 'unnamed_file'
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    
    # Remove script tags and other dangerous content
    filename = re.sub(r'<[^>]*>', '', filename)
    
    # Remove path traversal attempts
    filename = filename.replace('..', '')
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    
    # Ensure we have a filename
    if not filename or filename.isspace():
        filename = 'sanitized_file'
    
    return filename


def check_file_size_limits(file_path):
    """
    Check if a file meets size requirements.
    
    Args:
        file_path: Path to the file
        
    Returns:
        bool: True if file size is within limits
    """
    try:
        file_size = os.path.getsize(file_path)
        return MIN_FILE_SIZE <= file_size <= MAX_FILE_SIZE
    except OSError:
        return False


def validate_audio_format(file_path):
    """
    Validate audio file format using magic numbers.
    
    Args:
        file_path: Path to the audio file
        
    Returns:
        bool: True if format is valid
    """
    try:
        import magic
        mime_type = magic.from_file(file_path, mime=True)
        return mime_type in ALLOWED_MIME_TYPES
    except ImportError:
        # Fallback to extension-based validation
        _, ext = os.path.splitext(file_path)
        return ext.lower().lstrip('.') in ALLOWED_EXTENSIONS
    except Exception:
        return False