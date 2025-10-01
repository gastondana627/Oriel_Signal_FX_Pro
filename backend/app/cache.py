"""
Caching system for frequently accessed data
"""
import redis
import json
import pickle
from functools import wraps
from datetime import datetime, timedelta
from flask import current_app
from typing import Any, Optional, Union, Callable
import hashlib

class CacheManager:
    """Redis-based cache manager for application data"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.default_timeout = 300  # 5 minutes
        
    def init_app(self, app):
        """Initialize cache with Flask app"""
        redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        # Use database 2 for caching to separate from job queue
        cache_redis_url = redis_url.replace('/0', '/2')
        self.redis_client = redis.from_url(cache_redis_url, decode_responses=True)
        
    def _make_key(self, key: str, prefix: str = 'cache') -> str:
        """Generate cache key with prefix"""
        return f"{prefix}:{key}"
    
    def get(self, key: str, default=None) -> Any:
        """Get value from cache"""
        try:
            cache_key = self._make_key(key)
            value = self.redis_client.get(cache_key)
            if value is None:
                return default
            return json.loads(value)
        except (redis.RedisError, json.JSONDecodeError) as e:
            current_app.logger.warning(f"Cache get error for key {key}: {e}")
            return default
    
    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> bool:
        """Set value in cache with optional timeout"""
        try:
            cache_key = self._make_key(key)
            timeout = timeout or self.default_timeout
            serialized_value = json.dumps(value, default=str)
            return self.redis_client.setex(cache_key, timeout, serialized_value)
        except (redis.RedisError, TypeError) as e:
            current_app.logger.warning(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            cache_key = self._make_key(key)
            return bool(self.redis_client.delete(cache_key))
        except redis.RedisError as e:
            current_app.logger.warning(f"Cache delete error for key {key}: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            cache_pattern = self._make_key(pattern)
            keys = self.redis_client.keys(cache_pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except redis.RedisError as e:
            current_app.logger.warning(f"Cache clear pattern error for {pattern}: {e}")
            return 0
    
    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache"""
        try:
            cache_key = self._make_key(key)
            return self.redis_client.incr(cache_key, amount)
        except redis.RedisError as e:
            current_app.logger.warning(f"Cache increment error for key {key}: {e}")
            return None
    
    def expire(self, key: str, timeout: int) -> bool:
        """Set expiration for existing key"""
        try:
            cache_key = self._make_key(key)
            return self.redis_client.expire(cache_key, timeout)
        except redis.RedisError as e:
            current_app.logger.warning(f"Cache expire error for key {key}: {e}")
            return False

# Global cache instance
cache = CacheManager()

def cached(timeout: int = 300, key_func: Optional[Callable] = None):
    """
    Decorator for caching function results
    
    Args:
        timeout: Cache timeout in seconds
        key_func: Function to generate cache key from function args
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation from function name and args
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        
        # Add cache control methods to function
        wrapper.cache_clear = lambda: cache.clear_pattern(f"{func.__name__}:*")
        wrapper.cache_key = lambda *args, **kwargs: (
            key_func(*args, **kwargs) if key_func 
            else hashlib.md5(":".join([func.__name__] + [str(arg) for arg in args] + 
                                    [f"{k}:{v}" for k, v in sorted(kwargs.items())]).encode()).hexdigest()
        )
        
        return wrapper
    return decorator

def cache_user_stats(user_id: int, timeout: int = 600):
    """Cache user statistics for dashboard"""
    def key_func(user_id):
        return f"user_stats:{user_id}"
    return cached(timeout=timeout, key_func=key_func)

def cache_system_metrics(timeout: int = 60):
    """Cache system metrics for admin dashboard"""
    def key_func():
        return "system_metrics"
    return cached(timeout=timeout, key_func=key_func)

def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a user"""
    patterns = [
        f"user_stats:{user_id}",
        f"user_jobs:{user_id}",
        f"user_payments:{user_id}"
    ]
    for pattern in patterns:
        cache.delete(pattern)

def invalidate_system_cache():
    """Invalidate system-wide cache entries"""
    patterns = [
        "system_metrics",
        "job_queue_stats",
        "admin_dashboard_*"
    ]
    for pattern in patterns:
        cache.clear_pattern(pattern)