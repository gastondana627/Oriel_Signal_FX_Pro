from datetime import datetime
from app import db

class User(db.Model):
    __tablename__ = 'user'
    __table_args__ = (
        db.Index('idx_user_email_active', 'email', 'is_active'),
        db.Index('idx_user_created_at', 'created_at'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    def __repr__(self):
        return f'<User {self.email}>'

class Payment(db.Model):
    __tablename__ = 'payment'
    __table_args__ = (
        db.Index('idx_payment_user_status', 'user_id', 'status'),
        db.Index('idx_payment_created_at', 'created_at'),
        db.Index('idx_payment_status_created', 'status', 'created_at'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    stripe_session_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    amount = db.Column(db.Integer, nullable=False)  # Amount in cents
    status = db.Column(db.String(50), default='pending', index=True)  # pending, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    user = db.relationship('User', backref=db.backref('payments', lazy='dynamic'))
    
    def __repr__(self):
        return f'<Payment {self.stripe_session_id}>'

class RenderJob(db.Model):
    __tablename__ = 'render_job'
    __table_args__ = (
        db.Index('idx_renderjob_user_status', 'user_id', 'status'),
        db.Index('idx_renderjob_status_created', 'status', 'created_at'),
        db.Index('idx_renderjob_user_created', 'user_id', 'created_at'),
        db.Index('idx_renderjob_completed_at', 'completed_at'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payment.id'), nullable=False, index=True)
    status = db.Column(db.String(50), default='queued', index=True)  # queued, processing, completed, failed
    audio_filename = db.Column(db.String(255))
    render_config = db.Column(db.JSON)
    video_url = db.Column(db.String(500))
    gcs_blob_name = db.Column(db.String(500))  # GCS blob path for the video file
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime, index=True)
    
    user = db.relationship('User', backref=db.backref('render_jobs', lazy='dynamic'))
    payment = db.relationship('Payment', backref=db.backref('render_jobs', lazy='dynamic'))
    
    def __repr__(self):
        return f'<RenderJob {self.id} - {self.status}>'


class PasswordResetToken(db.Model):
    """Model to store password reset tokens"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    
    user = db.relationship('User', backref=db.backref('reset_tokens', lazy=True))
    
    def __repr__(self):
        return f'<PasswordResetToken {self.token}>'
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        return not self.used and not self.is_expired()


class JobMetrics(db.Model):
    """Model to store job performance metrics"""
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.String(255), nullable=False, index=True)
    job_type = db.Column(db.String(50), nullable=False)  # render_video, send_email, cleanup
    status = db.Column(db.String(50), nullable=False)  # completed, failed
    duration_seconds = db.Column(db.Float)
    queue_wait_time = db.Column(db.Float)  # Time spent in queue before processing
    memory_usage_mb = db.Column(db.Float)
    cpu_usage_percent = db.Column(db.Float)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<JobMetrics {self.job_id} - {self.status}>'


class SystemHealth(db.Model):
    """Model to store system health metrics"""
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Queue metrics
    queue_high_priority_length = db.Column(db.Integer, default=0)
    queue_video_rendering_length = db.Column(db.Integer, default=0)
    queue_cleanup_length = db.Column(db.Integer, default=0)
    
    # Worker metrics
    active_workers = db.Column(db.Integer, default=0)
    failed_jobs_count = db.Column(db.Integer, default=0)
    
    # Database metrics
    total_users = db.Column(db.Integer, default=0)
    active_jobs = db.Column(db.Integer, default=0)
    completed_jobs_today = db.Column(db.Integer, default=0)
    failed_jobs_today = db.Column(db.Integer, default=0)
    
    # System resources
    memory_usage_percent = db.Column(db.Float)
    cpu_usage_percent = db.Column(db.Float)
    disk_usage_percent = db.Column(db.Float)
    
    # External services status
    redis_status = db.Column(db.String(20), default='unknown')  # healthy, unhealthy, unknown
    gcs_status = db.Column(db.String(20), default='unknown')
    sendgrid_status = db.Column(db.String(20), default='unknown')
    
    def __repr__(self):
        return f'<SystemHealth {self.timestamp}>'