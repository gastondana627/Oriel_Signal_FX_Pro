"""
Load testing configuration for the backend API using Locust.
"""
from locust import HttpUser, task, between
import json
import random


class BackendUser(HttpUser):
    """Simulated user for load testing the backend API."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Called when a user starts. Perform login."""
        self.login()
    
    def login(self):
        """Login and store authentication token."""
        # For load testing, we'll use a test user
        response = self.client.post("/api/auth/login", json={
            "email": "loadtest@example.com",
            "password": "LoadTest123!"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            self.headers = {'Authorization': f'Bearer {self.token}'}
        else:
            # If login fails, use empty headers (will test unauthorized access)
            self.headers = {}
    
    @task(3)
    def health_check(self):
        """Test health check endpoint (most frequent)."""
        self.client.get("/api/health")
    
    @task(2)
    def get_user_profile(self):
        """Test user profile endpoint."""
        self.client.get("/api/user/profile", headers=self.headers)
    
    @task(2)
    def get_user_history(self):
        """Test user history endpoint."""
        self.client.get("/api/user/history", headers=self.headers)
    
    @task(1)
    def create_payment_session(self):
        """Test payment session creation."""
        self.client.post("/api/payments/create-session", 
                        headers=self.headers,
                        json={
                            "product_type": "basic_video",
                            "quantity": 1,
                            "success_url": "https://example.com/success",
                            "cancel_url": "https://example.com/cancel"
                        })
    
    @task(1)
    def get_job_status(self):
        """Test job status endpoint with random job ID."""
        job_id = f"test-job-{random.randint(1000, 9999)}"
        self.client.get(f"/api/jobs/status/{job_id}", headers=self.headers)


class AdminUser(HttpUser):
    """Simulated admin user for testing admin endpoints."""
    
    wait_time = between(2, 5)  # Admins are less frequent
    weight = 1  # Lower weight means fewer admin users
    
    def on_start(self):
        """Admin login."""
        response = self.client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "AdminTest123!"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            self.headers = {'Authorization': f'Bearer {self.token}'}
        else:
            self.headers = {}
    
    @task(2)
    def admin_dashboard(self):
        """Test admin dashboard access."""
        self.client.get("/admin/", headers=self.headers)
    
    @task(1)
    def system_health(self):
        """Test system health monitoring."""
        self.client.get("/admin/api/health", headers=self.headers)


class AnonymousUser(HttpUser):
    """Simulated anonymous user testing public endpoints."""
    
    wait_time = between(1, 2)
    weight = 2  # More anonymous users
    
    @task(5)
    def health_check(self):
        """Test public health check."""
        self.client.get("/api/health")
    
    @task(2)
    def register_attempt(self):
        """Test user registration."""
        user_id = random.randint(10000, 99999)
        self.client.post("/api/auth/register", json={
            "email": f"loadtest{user_id}@example.com",
            "password": "LoadTest123!"
        })
    
    @task(1)
    def login_attempt(self):
        """Test login with random credentials."""
        self.client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })


# Custom load testing scenarios
class StressTestUser(HttpUser):
    """High-frequency user for stress testing."""
    
    wait_time = between(0.1, 0.5)  # Very fast requests
    weight = 1  # Few stress test users
    
    @task
    def rapid_health_checks(self):
        """Rapid fire health checks."""
        self.client.get("/api/health")
    
    @task
    def rapid_auth_attempts(self):
        """Rapid authentication attempts."""
        self.client.post("/api/auth/login", json={
            "email": "stress@example.com",
            "password": "wrong"
        })


# Load testing configuration
class LoadTestConfig:
    """Configuration for different load testing scenarios."""
    
    # Light load: Normal usage
    LIGHT_LOAD = {
        'users': 10,
        'spawn_rate': 2,
        'run_time': '2m'
    }
    
    # Medium load: Busy period
    MEDIUM_LOAD = {
        'users': 50,
        'spawn_rate': 5,
        'run_time': '5m'
    }
    
    # Heavy load: Peak usage
    HEAVY_LOAD = {
        'users': 100,
        'spawn_rate': 10,
        'run_time': '10m'
    }
    
    # Stress test: Beyond normal capacity
    STRESS_TEST = {
        'users': 200,
        'spawn_rate': 20,
        'run_time': '5m'
    }


# Example usage:
# locust -f locustfile.py --host=http://localhost:5000 -u 50 -r 5 -t 300s
# 
# Parameters:
# -u, --users: Number of concurrent users
# -r, --spawn-rate: Rate to spawn users (users per second)
# -t, --run-time: Stop after specified time (e.g., 300s, 20m, 3h)
# --host: Target host URL
#
# For headless mode (no web UI):
# locust -f locustfile.py --host=http://localhost:5000 -u 50 -r 5 -t 300s --headless
#
# To run specific user class:
# locust -f locustfile.py BackendUser --host=http://localhost:5000