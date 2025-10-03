from datetime import datetime
import uuid
from app import db

class User(db.Model):
    __tablename__ = 'user'
    __table_args__ = (
        db.Index('idx_user_email_active', 'email', 'is_active'),
        db.Index('idx_user_created_at', 'created_at'),
        db.Index('idx_user_account_type', 'account_type'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Enhanced fields for your vision
    account_type = db.Column(db.String(20), default='user', index=True)  # user, training, admin
    playlists = db.Column(db.Text)  # Comma-separated playlist preferences
    marketing_consent = db.Column(db.Boolean, default=False)
    plan = db.Column(db.String(20), default='free')  # free, starter, pro
    
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


class Purchase(db.Model):
    """Model for one-time purchase records with download tracking"""
    __tablename__ = 'purchase'
    __table_args__ = (
        db.Index('idx_purchase_user_status', 'user_id', 'status'),
        db.Index('idx_purchase_status_created', 'status', 'created_at'),
        db.Index('idx_purchase_token', 'download_token'),
        db.Index('idx_purchase_expires', 'download_expires_at'),
    )
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)  # Nullable for guest purchases
    user_email = db.Column(db.String(255), nullable=True, index=True)  # Email for anonymous purchases
    file_id = db.Column(db.String(36), nullable=False)  # Generated file reference
    tier = db.Column(db.String(20), nullable=False, index=True)  # personal, commercial, premium
    amount = db.Column(db.Integer, nullable=False)  # Price in cents
    stripe_session_id = db.Column(db.String(255), unique=True, index=True)
    stripe_payment_intent = db.Column(db.String(255), index=True)
    status = db.Column(db.String(20), default='pending', index=True)  # pending, completed, failed
    download_token = db.Column(db.String(500), index=True)  # Secure download token
    download_expires_at = db.Column(db.DateTime, index=True)
    download_attempts = db.Column(db.Integer, default=0)
    license_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime, index=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('purchases', lazy='dynamic'))
    
    def __repr__(self):
        return f'<Purchase {self.id} - {self.tier} - {self.status}>'
    
    def is_download_expired(self):
        """Check if download link has expired"""
        if not self.download_expires_at:
            return True
        return datetime.utcnow() > self.download_expires_at
    
    def can_download(self):
        """Check if purchase allows downloads"""
        return (
            self.status == 'completed' and
            not self.is_download_expired() and
            self.download_attempts < 5  # Max attempts from design
        )


class FreeDownloadUsage(db.Model):
    """Model for tracking free tier download limits"""
    __tablename__ = 'free_download_usage'
    __table_args__ = (
        db.Index('idx_free_usage_user', 'user_id'),
        db.Index('idx_free_usage_session', 'session_id'),
        db.Index('idx_free_usage_created', 'created_at'),
    )
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)  # Null for anonymous
    session_id = db.Column(db.String(255), index=True)  # For anonymous users
    downloads_used = db.Column(db.Integer, default=0)
    max_downloads = db.Column(db.Integer, default=3)  # 3 for anonymous, 5 for registered
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('free_usage', lazy='dynamic'))
    
    def __repr__(self):
        return f'<FreeDownloadUsage {self.id} - {self.downloads_used}/{self.max_downloads}>'
    
    def has_downloads_remaining(self):
        """Check if user has free downloads remaining"""
        return self.downloads_used < self.max_downloads
    
    def get_remaining_downloads(self):
        """Get number of remaining free downloads"""
        return max(0, self.max_downloads - self.downloads_used)