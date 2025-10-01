#!/usr/bin/env python3
"""
Development server runner with minimal security for localhost testing
"""
import os
import sys
from flask import Flask
from flask_cors import CORS

# Simple Flask app for development testing
def create_simple_app():
    app = Flask(__name__)
    
    # Basic configuration
    app.config['SECRET_KEY'] = 'dev-secret-key'
    app.config['DEBUG'] = True
    app.config['ENV'] = 'development'
    
    # Enable CORS for all origins in development
    CORS(app, origins="*")
    
    # Basic security headers
    @app.after_request
    def add_basic_headers(response):
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response
    
    # Health check endpoint
    @app.route('/api/health')
    def health():
        return {'status': 'healthy', 'message': 'Development server is running'}
    
    # API documentation endpoint
    @app.route('/api/docs')
    def api_docs():
        return {'message': 'API Documentation', 'version': '1.0.0'}
    
    # Admin interface endpoint
    @app.route('/admin/')
    def admin():
        return {'message': 'Admin interface', 'status': 'accessible'}
    
    # User registration endpoint
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        return {'message': 'Registration endpoint', 'status': 'working'}
    
    # 404 handler
    @app.errorhandler(404)
    def not_found(error):
        return {'error': {'code': 'NOT_FOUND', 'message': 'Endpoint not found'}}, 404
    
    return app

if __name__ == '__main__':
    print("🚀 Starting development server...")
    print("📍 This is a minimal server for localhost testing")
    print("🔧 Install dependencies with: pip install -r requirements.txt")
    print("=" * 60)
    
    app = create_simple_app()
    app.run(host='0.0.0.0', port=5000, debug=True)