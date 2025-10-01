"""
Job queue system for background processing.
"""
from flask import Blueprint

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

from .queue import init_queue, get_queue, enqueue_job
from .jobs import render_video_job, send_completion_email, cleanup_files
from app.jobs import routes

__all__ = [
    'bp',
    'init_queue',
    'get_queue', 
    'enqueue_job',
    'render_video_job',
    'send_completion_email',
    'cleanup_files'
]