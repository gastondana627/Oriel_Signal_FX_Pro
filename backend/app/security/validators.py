"""
Security validation utilities.
"""
import os
import re
import magic
import logging
from typing import Dict, Any, Optional
from werkzeug.datastructures import FileStorage
from flask import current_app

logger = logging.getLogger(__name__)

# Allowed file types and their MIME types
ALLOWED_AUDIO_TYPES = {
    'mp3': ['audio/mpeg', 'audio/mp3'],
    'wav': ['audio/wav', 'audio/wave', 'audio/x-wav'],
    'flac': ['audio/flac', 'audio/x-flac'],
    'ogg': ['audio/ogg', 'application/ogg'],
    'm4a': ['audio/mp4', 'audio/x-m4a'],
    'aac': ['audio/aac', 'audio/x-aac']
}

# Maximum file sizes (in bytes)
MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_FILENAME_LENGTH = 255

class SecurityValidationError(Exception):
    """Exception raised for security validation failures."""
    pass

def validate_file_upload(file_obj: FileStorage, allowed_types: Dict[str, list] = None) -> Dict[str, Any]:
    """
    Comprehensive security validation for file uploads.
    
    Args:
        file_obj: FileStorage object from Flask request
        allowed_types: Dictionary of allowed file extensions and MIME types
        
    Returns:
        dict: Validation results with file metadata
        
    Raises:
        SecurityValidationError: If validation fails
    """
    if allowed_types is None:
        allowed_types = ALLOWED_AUDIO_TYPES
    
    if not isinstance(file_obj, FileStorage):
        raise SecurityValidationError("Invalid file object")
    
    if not file_obj.filename:
        raise SecurityValidationError("No filename provided")
    
    # Sanitize filename
    filename = sanitize_filename(file_obj.filename)
    
    # Check filename length
    if len(filename) > MAX_FILENAME_LENGTH:
        raise SecurityValidationError(f"Filename too long (max {MAX_FILENAME_LENGTH} characters)")
    
    # Get file extension
    file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    if not file_ext or file_ext not in allowed_types:
        allowed_exts = ', '.join(allowed_types.keys())
        raise SecurityValidationError(f"File type not allowed. Allowed types: {allowed_exts}")
    
    # Check file size
    file_obj.seek(0, os.SEEK_END)
    file_size = file_obj.tell()
    file_obj.seek(0)
    
    if file_size == 0:
        raise SecurityValidationError("Empty file not allowed")
    
    if file_size > MAX_AUDIO_SIZE:
        raise SecurityValidationError(f"File too large (max {MAX_AUDIO_SIZE // (1024*1024)}MB)")
    
    # Validate MIME type using python-magic
    try:
        file_obj.seek(0)
        file_data = file_obj.read(1024)  # Read first 1KB for MIME detection
        file_obj.seek(0)
        
        detected_mime = magic.from_buffer(file_data, mime=True)
        
        if detected_mime not in allowed_types[file_ext]:
            logger.warning(f"MIME type mismatch: detected {detected_mime}, expected one of {allowed_types[file_ext]}")
            raise SecurityValidationError("File content doesn't match extension")
        
    except Exception as e:
        logger.warning(f"Could not validate MIME type: {e}")
        # Continue without MIME validation if python-magic is not available
    
    # Check for malicious content patterns
    file_obj.seek(0)
    content_sample = file_obj.read(4096).decode('utf-8', errors='ignore')
    file_obj.seek(0)
    
    if contains_malicious_patterns(content_sample):
        raise SecurityValidationError("File contains potentially malicious content")
    
    logger.info(f"File validation passed: {filename} ({file_size} bytes, {file_ext})")
    
    return {
        'filename': filename,
        'size': file_size,
        'extension': file_ext,
        'mime_type': detected_mime if 'detected_mime' in locals() else 'unknown',
        'safe': True
    }

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and other attacks.
    
    Args:
        filename: Original filename
        
    Returns:
        str: Sanitized filename
    """
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove or replace dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    
    # Ensure filename is not empty
    if not filename:
        filename = 'unnamed_file'
    
    # Limit length
    if len(filename) > MAX_FILENAME_LENGTH:
        name, ext = os.path.splitext(filename)
        max_name_len = MAX_FILENAME_LENGTH - len(ext)
        filename = name[:max_name_len] + ext
    
    return filename

def sanitize_input(input_str: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks.
    
    Args:
        input_str: Input string to sanitize
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized input
    """
    if not isinstance(input_str, str):
        return str(input_str)
    
    # Limit length
    input_str = input_str[:max_length]
    
    # Remove control characters
    input_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', input_str)
    
    # Remove potentially dangerous HTML/script tags
    input_str = re.sub(r'<[^>]*>', '', input_str)
    
    # Remove SQL injection patterns
    sql_patterns = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
        r'(--|#|/\*|\*/)',
        r'(\bOR\b.*=.*\bOR\b)',
        r'(\bAND\b.*=.*\bAND\b)'
    ]
    
    for pattern in sql_patterns:
        input_str = re.sub(pattern, '', input_str, flags=re.IGNORECASE)
    
    return input_str.strip()

def contains_malicious_patterns(content: str) -> bool:
    """
    Check if content contains potentially malicious patterns.
    
    Args:
        content: Content to check
        
    Returns:
        bool: True if malicious patterns found
    """
    malicious_patterns = [
        r'<script[^>]*>',
        r'javascript:',
        r'vbscript:',
        r'onload\s*=',
        r'onerror\s*=',
        r'eval\s*\(',
        r'exec\s*\(',
        r'system\s*\(',
        r'shell_exec\s*\(',
        r'passthru\s*\(',
        r'file_get_contents\s*\(',
        r'fopen\s*\(',
        r'fwrite\s*\(',
        r'include\s*\(',
        r'require\s*\(',
    ]
    
    for pattern in malicious_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            logger.warning(f"Malicious pattern detected: {pattern}")
            return True
    
    return False

def validate_json_input(data: dict, required_fields: list, max_depth: int = 10) -> dict:
    """
    Validate JSON input for security and completeness.
    
    Args:
        data: JSON data to validate
        required_fields: List of required field names
        max_depth: Maximum nesting depth allowed
        
    Returns:
        dict: Validated and sanitized data
        
    Raises:
        SecurityValidationError: If validation fails
    """
    if not isinstance(data, dict):
        raise SecurityValidationError("Input must be a JSON object")
    
    # Check nesting depth
    if get_dict_depth(data) > max_depth:
        raise SecurityValidationError(f"JSON nesting too deep (max {max_depth} levels)")
    
    # Check required fields
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise SecurityValidationError(f"Missing required fields: {', '.join(missing_fields)}")
    
    # Sanitize string values
    sanitized_data = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized_data[key] = sanitize_input(value)
        elif isinstance(value, dict):
            sanitized_data[key] = validate_json_input(value, [], max_depth - 1)
        elif isinstance(value, list):
            sanitized_data[key] = [sanitize_input(item) if isinstance(item, str) else item for item in value]
        else:
            sanitized_data[key] = value
    
    return sanitized_data

def get_dict_depth(d: dict, depth: int = 0) -> int:
    """
    Calculate the maximum nesting depth of a dictionary.
    
    Args:
        d: Dictionary to analyze
        depth: Current depth
        
    Returns:
        int: Maximum depth
    """
    if not isinstance(d, dict):
        return depth
    
    return max([get_dict_depth(v, depth + 1) for v in d.values()] + [depth])

def validate_ip_address(ip: str) -> bool:
    """
    Validate IP address format.
    
    Args:
        ip: IP address string
        
    Returns:
        bool: True if valid IP address
    """
    import ipaddress
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def is_safe_redirect_url(url: str, allowed_hosts: list = None) -> bool:
    """
    Check if a redirect URL is safe (prevents open redirect attacks).
    
    Args:
        url: URL to validate
        allowed_hosts: List of allowed host names
        
    Returns:
        bool: True if URL is safe for redirect
    """
    if not url:
        return False
    
    # Allow relative URLs
    if url.startswith('/') and not url.startswith('//'):
        return True
    
    # Check absolute URLs
    from urllib.parse import urlparse
    parsed = urlparse(url)
    
    if not parsed.netloc:
        return True  # Relative URL
    
    if allowed_hosts:
        return parsed.netloc.lower() in [host.lower() for host in allowed_hosts]
    
    # Default to current app's host if no allowed hosts specified
    if hasattr(current_app, 'config'):
        app_host = current_app.config.get('SERVER_NAME')
        if app_host:
            return parsed.netloc.lower() == app_host.lower()
    
    return False