#!/usr/bin/env python3
"""
Minimal Flask server for testing - bypasses all complex imports
"""
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, origins="*")

# Basic configuration
app.config['DEBUG'] = True

@app.after_request
def add_headers(response):
    """Add basic security headers"""
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'message': 'Minimal server is running'})

@app.route('/api/docs')
def api_docs():
    return jsonify({'message': 'API Documentation', 'version': '1.0.0'})

@app.route('/admin/')
def admin():
    return jsonify({'message': 'Admin interface', 'status': 'accessible'})

@app.route('/api/auth/register', methods=['POST'])
def register():
    return jsonify({'message': 'Registration endpoint', 'status': 'working'})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Endpoint not found'}}), 404

if __name__ == '__main__':
    print("🚀 Starting minimal Flask server on port 8000...")
    print("📍 This server bypasses all complex security imports")
    print("🔧 Testing basic Flask functionality")
    print("💡 Using port 8000 to avoid macOS AirPlay conflict")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=8000, debug=True)