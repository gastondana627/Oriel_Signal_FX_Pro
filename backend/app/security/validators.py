"""
Security validation utilities.
"""
import os
import re
import magic
import logging
from functools import wraps
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

def sanitize_input(input_str: str, max_length: int = 1000, allow_html: bool = False) -> str:
    """
    Enhanced sanitize user input to prevent injection attacks.
    
    Args:
        input_str: Input string to sanitize
        max_length: Maximum allowed length
        allow_html: Whether to allow basic HTML tags
        
    Returns:
        str: Sanitized input
    """
    if not isinstance(input_str, str):
        return str(input_str)
    
    # Limit length
    input_str = input_str[:max_length]
    
    # Remove null bytes and control characters
    input_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', input_str)
    
    # Enhanced SQL injection prevention
    sql_patterns = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE)\b)',
        r'(--|#|/\*|\*/|;)',
        r'(\bOR\b\s+\d+\s*=\s*\d+)',
        r'(\bAND\b\s+\d+\s*=\s*\d+)',
        r'(\bUNION\b\s+(ALL\s+)?SELECT)',
        r'(\bINTO\b\s+(OUTFILE|DUMPFILE))',
        r'(\bLOAD_FILE\s*\()',
        r'(\bSLEEP\s*\()',
        r'(\bBENCHMARK\s*\()',
        r'(\bEXTRACTVALUE\s*\()',
        r'(\bUPDATEXML\s*\()',
        r'(\bWAITFOR\s+DELAY)',
        r'(\bEXEC\s*\()',
        r'(\bSP_\w+)',
        r'(\bXP_\w+)',
        r'(\bCMDSHELL)',
        r'(\bSHUTDOWN)',
        r'(\bDBCC\s+\w+)'
    ]
    
    for pattern in sql_patterns:
        input_str = re.sub(pattern, '', input_str, flags=re.IGNORECASE)
    
    # XSS prevention
    if not allow_html:
        # Remove all HTML/XML tags
        input_str = re.sub(r'<[^>]*>', '', input_str)
    else:
        # Remove dangerous attributes and scripts
        input_str = re.sub(r'<(\w+)[^>]*?(on\w+|javascript:|vbscript:|data:)[^>]*?>', r'<\1>', input_str, flags=re.IGNORECASE)
        input_str = re.sub(r'<script[^>]*>.*?</script>', '', input_str, flags=re.IGNORECASE | re.DOTALL)
        input_str = re.sub(r'<style[^>]*>.*?</style>', '', input_str, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove JavaScript protocols
    js_protocols = [
        r'javascript:',
        r'vbscript:',
        r'data:text/html',
        r'file://'
    ]
    
    for protocol in js_protocols:
        input_str = re.sub(protocol, '', input_str, flags=re.IGNORECASE)
    
    # Command injection prevention
    input_str = re.sub(r'[;&|`$(){}[\]\\]', '', input_str)
    
    # Path traversal prevention
    input_str = re.sub(r'\.\./', '', input_str)
    input_str = re.sub(r'\.\.\\', '', input_str)
    input_str = re.sub(r'%2e%2e%2f', '', input_str, flags=re.IGNORECASE)
    
    # NoSQL injection prevention
    nosql_patterns = [r'\$where', r'\$ne', r'\$gt', r'\$lt', r'\$regex']
    for pattern in nosql_patterns:
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

def prevent_sql_injection(func):
    """
    Decorator to automatically sanitize function arguments for SQL injection prevention.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Sanitize string arguments
        sanitized_args = []
        for arg in args:
            if isinstance(arg, str):
                sanitized_args.append(sanitize_input(arg))
            else:
                sanitized_args.append(arg)
        
        # Sanitize string keyword arguments
        sanitized_kwargs = {}
        for key, value in kwargs.items():
            if isinstance(value, str):
                sanitized_kwargs[key] = sanitize_input(value)
            else:
                sanitized_kwargs[key] = value
        
        return func(*sanitized_args, **sanitized_kwargs)
    return wrapper

def validate_database_query(query: str, allowed_operations: list = None) -> bool:
    """
    Validate database query for security issues.
    
    Args:
        query: SQL query to validate
        allowed_operations: List of allowed SQL operations (SELECT, INSERT, etc.)
        
    Returns:
        bool: True if query is safe
    """
    if not isinstance(query, str):
        return False
    
    # Default allowed operations
    if allowed_operations is None:
        allowed_operations = ['SELECT', 'INSERT', 'UPDATE']
    
    # Convert to uppercase for checking
    query_upper = query.upper().strip()
    
    # Check if query starts with allowed operation
    starts_with_allowed = any(query_upper.startswith(op) for op in allowed_operations)
    if not starts_with_allowed:
        logger.warning(f"Query starts with disallowed operation: {query[:50]}...")
        return False
    
    # Check for dangerous patterns
    dangerous_patterns = [
        r';\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE)',
        r'UNION\s+SELECT',
        r'INTO\s+(OUTFILE|DUMPFILE)',
        r'LOAD_FILE\s*\(',
        r'BENCHMARK\s*\(',
        r'SLEEP\s*\(',
        r'WAITFOR\s+DELAY',
        r'EXEC\s*\(',
        r'SP_\w+',
        r'XP_\w+',
        r'CMDSHELL',
        r'SHUTDOWN',
        r'--\s*[^\r\n]*(\r|\n|$)',  # SQL comments
        r'/\*.*?\*/',  # Multi-line comments
        r'INFORMATION_SCHEMA',
        r'SYS\.',
        r'MASTER\.',
        r'MSDB\.',
        r'TEMPDB\.'
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, query_upper):
            logger.warning(f"Dangerous pattern found in query: {pattern}")
            return False
    
    # Check for excessive UNION statements (potential UNION-based injection)
    union_count = len(re.findall(r'\bUNION\b', query_upper))
    if union_count > 2:
        logger.warning(f"Excessive UNION statements in query: {union_count}")
        return False
    
    # Check for suspicious WHERE clauses (1=1, OR 1=1, etc.)
    suspicious_where = [
        r'WHERE\s+1\s*=\s*1',
        r'WHERE\s+\d+\s*=\s*\d+',
        r'OR\s+1\s*=\s*1',
        r'OR\s+\d+\s*=\s*\d+',
        r'AND\s+1\s*=\s*1',
        r'AND\s+\d+\s*=\s*\d+'
    ]
    
    for pattern in suspicious_where:
        if re.search(pattern, query_upper):
            logger.warning(f"Suspicious WHERE clause in query: {pattern}")
            return False
    
    return True

def escape_sql_identifier(identifier: str) -> str:
    """
    Escape SQL identifier (table name, column name) to prevent injection.
    
    Args:
        identifier: SQL identifier to escape
        
    Returns:
        str: Escaped identifier
    """
    if not isinstance(identifier, str):
        raise ValueError("Identifier must be a string")
    
    # Remove any existing quotes
    identifier = identifier.strip('"').strip("'").strip('`')
    
    # Validate identifier format (alphanumeric + underscore only)
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', identifier):
        raise ValueError(f"Invalid identifier format: {identifier}")
    
    # Escape with double quotes (ANSI SQL standard)
    return f'"{identifier}"'

def validate_email_security(email: str) -> bool:
    """
    Enhanced email validation with security checks.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if email is valid and safe
    """
    if not isinstance(email, str):
        return False
    
    # Basic format validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False
    
    # Length check
    if len(email) > 254:  # RFC 5321 limit
        return False
    
    # Check for dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '\\', '\x00', '\r', '\n', '\t']
    if any(char in email for char in dangerous_chars):
        return False
    
    # Check for suspicious patterns
    suspicious_patterns = [
        r'javascript:',
        r'vbscript:',
        r'data:',
        r'file:',
        r'<script',
        r'</script>',
        r'onload=',
        r'onerror=',
        r'eval\(',
        r'exec\('
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, email, re.IGNORECASE):
            return False
    
    return True