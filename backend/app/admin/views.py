"""
Flask-Admin views for administrative interface.
"""
import os
from datetime import datetime, timedelta
from flask import current_app, request, redirect, url_for, flash
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.form import Select2Widget
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.security import check_password_hash
from wtforms import SelectField, TextAreaField, StringField
from wtforms.validators import DataRequired
import redis
from app import db
from app.models import User, Payment, RenderJob


class SecureAdminIndexView(AdminIndexView):
    """
    Secure admin index view with authentication.
    """
    
    @expose('/')
    def index(self):
        """Admin dashboard with system metrics."""
        try:
            # Check admin authentication
            if not self.is_admin_authenticated():
                return redirect(url_for('admin.login'))
            
            # Get system metrics
            metrics = self.get_system_metrics()
            
            return self.render('admin/dashboard.html', **metrics)
            
        except Exception as e:
            current_app.logger.error(f"Admin dashboard error: {e}")
            flash('Error loading dashboard', 'error')
            return self.render('admin/dashboard.html')
    
    @expose('/login', methods=['GET', 'POST'])
    def login(self):
        """Admin login page."""
        if request.method == 'POST':
            email = request.form.get('email')
            password = request.form.get('password')
            
            if self.authenticate_admin(email, password):
                return redirect(url_for('admin.index'))
            else:
                flash('Invalid credentials', 'error')
        
        return self.render('admin/login.html')
    
    @expose('/logout')
    def logout(self):
        """Admin logout."""
        # Clear admin session
        # In a real implementation, you'd clear the session
        flash('Logged out successfully', 'info')
        return redirect(url_for('admin.login'))
    
    def is_admin_authenticated(self):
        """Check if current user is authenticated admin."""
        try:
            # Simple admin check - in production, implement proper admin roles
            admin_email = os.environ.get('ADMIN_EMAIL')
            if not admin_email:
                return False
            
            # For now, check if there's a valid JWT token for admin user
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
            
            if current_user_id:
                user = User.query.get(int(current_user_id))
                return user and user.email == admin_email and user.is_active
            
            return False
            
        except Exception:
            return False
    
    def authenticate_admin(self, email, password):
        """Authenticate admin user."""
        try:
            admin_email = os.environ.get('ADMIN_EMAIL')
            admin_password = os.environ.get('ADMIN_PASSWORD')
            
            if not admin_email or not admin_password:
                current_app.logger.warning("Admin credentials not configured")
                return False
            
            # Check credentials
            if email == admin_email:
                # In production, use proper password hashing
                user = User.query.filter_by(email=email).first()
                if user and check_password_hash(user.password_hash, password):
                    return True
            
            return False
            
        except Exception as e:
            current_app.logger.error(f"Admin authentication error: {e}")
            return False
    
    def get_system_metrics(self):
        """Get system metrics for dashboard."""
        try:
            # User metrics
            total_users = User.query.count()
            active_users = User.query.filter_by(is_active=True).count()
            new_users_today = User.query.filter(
                User.created_at >= datetime.utcnow().date()
            ).count()
            
            # Payment metrics
            total_payments = Payment.query.count()
            completed_payments = Payment.query.filter_by(status='completed').count()
            total_revenue = db.session.query(db.func.sum(Payment.amount)).filter_by(
                status='completed'
            ).scalar() or 0
            
            # Job metrics
            total_jobs = RenderJob.query.count()
            completed_jobs = RenderJob.query.filter_by(status='completed').count()
            failed_jobs = RenderJob.query.filter_by(status='failed').count()
            processing_jobs = RenderJob.query.filter_by(status='processing').count()
            
            # Recent activity
            recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
            recent_jobs = RenderJob.query.order_by(RenderJob.created_at.desc()).limit(10).all()
            
            # Job queue status
            queue_status = self.get_queue_status()
            
            # System health and monitoring metrics
            monitoring_metrics = self.get_monitoring_metrics()
            
            return {
                'total_users': total_users,
                'active_users': active_users,
                'new_users_today': new_users_today,
                'total_payments': total_payments,
                'completed_payments': completed_payments,
                'total_revenue_cents': total_revenue,
                'total_revenue_dollars': total_revenue / 100 if total_revenue else 0,
                'total_jobs': total_jobs,
                'completed_jobs': completed_jobs,
                'failed_jobs': failed_jobs,
                'processing_jobs': processing_jobs,
                'recent_users': recent_users,
                'recent_jobs': recent_jobs,
                'queue_status': queue_status,
                'monitoring': monitoring_metrics
            }
            
        except Exception as e:
            current_app.logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def get_monitoring_metrics(self):
        """Get monitoring and health metrics."""
        try:
            from app.models import SystemHealth, JobMetrics
            from app.monitoring.alerts import AlertManager
            
            # Get latest system health
            latest_health = SystemHealth.query.order_by(
                SystemHealth.timestamp.desc()
            ).first()
            
            # Get recent job performance
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            recent_job_metrics = JobMetrics.query.filter(
                JobMetrics.created_at >= cutoff_time
            ).all()
            
            # Calculate performance stats
            total_jobs_24h = len(recent_job_metrics)
            failed_jobs_24h = len([m for m in recent_job_metrics if m.status == 'failed'])
            failure_rate = (failed_jobs_24h / total_jobs_24h * 100) if total_jobs_24h > 0 else 0
            
            # Average render time
            render_jobs = [m for m in recent_job_metrics if m.job_type == 'render_video' and m.duration_seconds]
            avg_render_time = sum(m.duration_seconds for m in render_jobs) / len(render_jobs) if render_jobs else 0
            
            # Check for active alerts
            alert_manager = AlertManager()
            active_alerts = alert_manager.check_alerts()
            
            return {
                'latest_health': latest_health,
                'jobs_24h': total_jobs_24h,
                'failed_jobs_24h': failed_jobs_24h,
                'failure_rate': failure_rate,
                'avg_render_time': avg_render_time,
                'active_alerts': active_alerts,
                'alert_count': len(active_alerts)
            }
            
        except Exception as e:
            current_app.logger.error(f"Error getting monitoring metrics: {e}")
            return {}
    
    def get_queue_status(self):
        """Get Redis queue status."""
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if not redis_url:
                return {'status': 'not_configured'}
            
            r = redis.from_url(redis_url)
            
            # Get queue lengths
            default_queue_length = r.llen('rq:queue:default')
            high_queue_length = r.llen('rq:queue:high')
            low_queue_length = r.llen('rq:queue:low')
            
            return {
                'status': 'connected',
                'default_queue': default_queue_length,
                'high_queue': high_queue_length,
                'low_queue': low_queue_length,
                'total_queued': default_queue_length + high_queue_length + low_queue_length
            }
            
        except Exception as e:
            current_app.logger.error(f"Redis queue status error: {e}")
            return {'status': 'error', 'error': str(e)}


class SecureModelView(ModelView):
    """Base model view with admin authentication."""
    
    def is_accessible(self):
        """Check if current user can access admin interface."""
        try:
            admin_email = os.environ.get('ADMIN_EMAIL')
            if not admin_email:
                return False
            
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
            
            if current_user_id:
                user = User.query.get(int(current_user_id))
                return user and user.email == admin_email and user.is_active
            
            return False
            
        except Exception:
            return False
    
    def inaccessible_callback(self, name, **kwargs):
        """Redirect to login if not accessible."""
        return redirect(url_for('admin.login'))


class UserAdminView(SecureModelView):
    """Admin view for User model."""
    
    column_list = ['id', 'email', 'created_at', 'is_active', 'payment_count', 'job_count']
    column_searchable_list = ['email']
    column_filters = ['is_active', 'created_at']
    column_sortable_list = ['id', 'email', 'created_at', 'is_active']
    column_default_sort = ('created_at', True)
    
    # Custom columns
    def payment_count(self, context, model, name):
        """Get payment count for user."""
        return Payment.query.filter_by(user_id=model.id).count()
    
    def job_count(self, context, model, name):
        """Get job count for user."""
        return RenderJob.query.filter_by(user_id=model.id).count()
    
    column_formatters = {
        'payment_count': payment_count,
        'job_count': job_count
    }
    
    # Form configuration
    form_excluded_columns = ['password_hash', 'payments', 'render_jobs', 'reset_tokens']
    
    # Actions
    @expose('/toggle_active/<int:user_id>')
    def toggle_active(self, user_id):
        """Toggle user active status."""
        try:
            user = User.query.get_or_404(user_id)
            user.is_active = not user.is_active
            db.session.commit()
            
            status = "activated" if user.is_active else "deactivated"
            flash(f'User {user.email} has been {status}', 'success')
            
        except Exception as e:
            current_app.logger.error(f"Error toggling user status: {e}")
            flash('Error updating user status', 'error')
            db.session.rollback()
        
        return redirect(url_for('user.index_view'))


class PaymentAdminView(SecureModelView):
    """Admin view for Payment model."""
    
    column_list = ['id', 'user.email', 'stripe_session_id', 'amount_dollars', 'status', 'created_at', 'job_count']
    column_searchable_list = ['stripe_session_id', 'user.email']
    column_filters = ['status', 'created_at']
    column_sortable_list = ['id', 'amount', 'status', 'created_at']
    column_default_sort = ('created_at', True)
    
    # Custom columns
    def amount_dollars(self, context, model, name):
        """Format amount in dollars."""
        return f"${model.amount / 100:.2f}" if model.amount else "$0.00"
    
    def job_count(self, context, model, name):
        """Get job count for payment."""
        return RenderJob.query.filter_by(payment_id=model.id).count()
    
    column_formatters = {
        'amount_dollars': amount_dollars,
        'job_count': job_count
    }
    
    # Form configuration
    form_excluded_columns = ['render_jobs']
    
    # Make amount read-only in edit form
    form_widget_args = {
        'amount': {'readonly': True},
        'stripe_session_id': {'readonly': True}
    }


class RenderJobAdminView(SecureModelView):
    """Admin view for RenderJob model."""
    
    column_list = ['id', 'user.email', 'status', 'audio_filename', 'created_at', 'completed_at', 'has_video']
    column_searchable_list = ['audio_filename', 'user.email']
    column_filters = ['status', 'created_at']
    column_sortable_list = ['id', 'status', 'created_at', 'completed_at']
    column_default_sort = ('created_at', True)
    
    # Custom columns
    def has_video(self, context, model, name):
        """Check if job has video output."""
        return bool(model.video_url)
    
    column_formatters = {
        'has_video': lambda v, c, m, p: '✓' if m.video_url else '✗'
    }
    
    # Form configuration
    form_excluded_columns = ['user', 'payment']
    
    # Custom form fields
    form_overrides = {
        'status': SelectField,
        'render_config': TextAreaField,
        'error_message': TextAreaField
    }
    
    form_args = {
        'status': {
            'choices': [
                ('queued', 'Queued'),
                ('processing', 'Processing'),
                ('completed', 'Completed'),
                ('failed', 'Failed')
            ]
        }
    }
    
    # Actions
    @expose('/retry_job/<int:job_id>')
    def retry_job(self, job_id):
        """Retry a failed job."""
        try:
            job = RenderJob.query.get_or_404(job_id)
            
            if job.status == 'failed':
                job.status = 'queued'
                job.error_message = None
                db.session.commit()
                
                # Re-enqueue the job
                from app.jobs.queue import enqueue_render_job
                enqueue_render_job(job.id)
                
                flash(f'Job {job.id} has been retried', 'success')
            else:
                flash('Only failed jobs can be retried', 'warning')
                
        except Exception as e:
            current_app.logger.error(f"Error retrying job: {e}")
            flash('Error retrying job', 'error')
            db.session.rollback()
        
        return redirect(url_for('renderjob.index_view'))
    
    @expose('/cancel_job/<int:job_id>')
    def cancel_job(self, job_id):
        """Cancel a queued or processing job."""
        try:
            job = RenderJob.query.get_or_404(job_id)
            
            if job.status in ['queued', 'processing']:
                job.status = 'failed'
                job.error_message = 'Job cancelled by administrator'
                db.session.commit()
                
                flash(f'Job {job.id} has been cancelled', 'success')
            else:
                flash('Only queued or processing jobs can be cancelled', 'warning')
                
        except Exception as e:
            current_app.logger.error(f"Error cancelling job: {e}")
            flash('Error cancelling job', 'error')
            db.session.rollback()
        
        return redirect(url_for('renderjob.index_view'))


def init_admin(app):
    """Initialize Flask-Admin with the app."""
    admin = Admin(
        app,
        name='Oriel Signal FX Pro Admin',
        template_mode='bootstrap4',
        index_view=SecureAdminIndexView()
    )
    
    # Add model views with unique endpoints
    admin.add_view(UserAdminView(User, db.session, name='Users', endpoint='admin_users'))
    admin.add_view(PaymentAdminView(Payment, db.session, name='Payments', endpoint='admin_payments'))
    admin.add_view(RenderJobAdminView(RenderJob, db.session, name='Render Jobs', endpoint='admin_jobs'))
    
    return admin