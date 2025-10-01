"""
Job management API routes.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.jobs.queue import get_job_status, get_queue_info, enqueue_job, clear_failed_jobs
from app.jobs.jobs import render_video_job, send_completion_email, cleanup_files
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

@bp.route('/status/<job_id>', methods=['GET'])
@jwt_required()
def job_status(job_id):
    """Get the status of a specific job."""
    try:
        status = get_job_status(job_id)
        return jsonify({
            'success': True,
            'job': status
        })
    except Exception as e:
        logger.error(f"Error getting job status for {job_id}: {e}")
        return jsonify({
            'error': {
                'code': 'JOB_STATUS_ERROR',
                'message': 'Failed to get job status'
            }
        }), 500

@bp.route('/queue-info', methods=['GET'])
@jwt_required()
def queue_info():
    """Get information about all job queues."""
    try:
        info = get_queue_info()
        return jsonify({
            'success': True,
            'queues': info
        })
    except Exception as e:
        logger.error(f"Error getting queue info: {e}")
        return jsonify({
            'error': {
                'code': 'QUEUE_INFO_ERROR',
                'message': 'Failed to get queue information'
            }
        }), 500

@bp.route('/test-job', methods=['POST'])
@jwt_required()
def test_job():
    """Create a test job for debugging purposes."""
    try:
        user_id = get_jwt_identity()
        
        # Enqueue a test email job
        job = enqueue_job(
            'high_priority',
            send_completion_email,
            'test@example.com',
            'https://example.com/test-video.mp4',
            'test-job-123'
        )
        
        return jsonify({
            'success': True,
            'job_id': job.id,
            'message': 'Test job enqueued successfully'
        })
        
    except Exception as e:
        logger.error(f"Error creating test job: {e}")
        return jsonify({
            'error': {
                'code': 'TEST_JOB_ERROR',
                'message': 'Failed to create test job'
            }
        }), 500

@bp.route('/clear-failed', methods=['POST'])
@jwt_required()
def clear_failed():
    """Clear failed jobs from queues (admin only)."""
    try:
        data = request.get_json() or {}
        queue_name = data.get('queue_name')
        
        clear_failed_jobs(queue_name)
        
        return jsonify({
            'success': True,
            'message': f'Failed jobs cleared from {queue_name or "all queues"}'
        })
        
    except Exception as e:
        logger.error(f"Error clearing failed jobs: {e}")
        return jsonify({
            'error': {
                'code': 'CLEAR_FAILED_ERROR',
                'message': 'Failed to clear failed jobs'
            }
        }), 500