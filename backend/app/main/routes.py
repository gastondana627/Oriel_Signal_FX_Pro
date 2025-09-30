from flask import jsonify
from app.main import bp

@bp.route('/')
@bp.route('/health')
def hello_world():
    """Health check endpoint for Railway deployment verification"""
    return jsonify({
        'message': 'Hello World - Oriel Signal FX Pro Backend',
        'status': 'healthy',
        'service': 'backend-api'
    })