"""
API documentation configuration using Flask-RESTX
"""
from flask_restx import Api, Resource, fields
from flask import Blueprint

# Create API documentation blueprint
api_bp = Blueprint('api_docs', __name__)

# Initialize Flask-RESTX API
api = Api(
    api_bp,
    version='1.0',
    title='Oriel Signal FX Pro API',
    description='Backend API for audio-reactive video rendering service',
    doc='/docs/',
    contact='support@orielfx.com',
    license='Proprietary',
    authorizations={
        'Bearer': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'JWT token in format: Bearer <token>'
        }
    },
    security='Bearer'
)

# Common response models
error_model = api.model('Error', {
    'error': fields.Nested(api.model('ErrorDetails', {
        'code': fields.String(required=True, description='Error code'),
        'message': fields.String(required=True, description='Error message'),
        'details': fields.Raw(description='Additional error details')
    }))
})

success_model = api.model('Success', {
    'message': fields.String(description='Success message'),
    'data': fields.Raw(description='Response data')
})

pagination_model = api.model('Pagination', {
    'page': fields.Integer(required=True, description='Current page number'),
    'per_page': fields.Integer(required=True, description='Items per page'),
    'total': fields.Integer(required=True, description='Total number of items'),
    'pages': fields.Integer(required=True, description='Total number of pages'),
    'has_prev': fields.Boolean(required=True, description='Has previous page'),
    'has_next': fields.Boolean(required=True, description='Has next page'),
    'prev_url': fields.String(description='Previous page URL'),
    'next_url': fields.String(description='Next page URL')
})

# Authentication models
user_registration_model = api.model('UserRegistration', {
    'email': fields.String(required=True, description='User email address'),
    'password': fields.String(required=True, description='User password (min 8 characters)')
})

user_login_model = api.model('UserLogin', {
    'email': fields.String(required=True, description='User email address'),
    'password': fields.String(required=True, description='User password')
})

token_response_model = api.model('TokenResponse', {
    'access_token': fields.String(required=True, description='JWT access token'),
    'refresh_token': fields.String(required=True, description='JWT refresh token'),
    'expires_in': fields.Integer(required=True, description='Token expiration time in seconds')
})

# User models
user_profile_model = api.model('UserProfile', {
    'id': fields.Integer(required=True, description='User ID'),
    'email': fields.String(required=True, description='User email'),
    'created_at': fields.DateTime(required=True, description='Account creation date'),
    'is_active': fields.Boolean(required=True, description='Account status')
})

# Payment models
payment_session_model = api.model('PaymentSession', {
    'amount': fields.Integer(required=True, description='Payment amount in cents'),
    'currency': fields.String(required=True, description='Payment currency', default='usd'),
    'success_url': fields.String(required=True, description='Success redirect URL'),
    'cancel_url': fields.String(required=True, description='Cancel redirect URL')
})

payment_session_response_model = api.model('PaymentSessionResponse', {
    'session_id': fields.String(required=True, description='Stripe session ID'),
    'checkout_url': fields.String(required=True, description='Stripe checkout URL')
})

payment_model = api.model('Payment', {
    'id': fields.Integer(required=True, description='Payment ID'),
    'stripe_session_id': fields.String(required=True, description='Stripe session ID'),
    'amount': fields.Integer(required=True, description='Payment amount in cents'),
    'status': fields.String(required=True, description='Payment status'),
    'created_at': fields.DateTime(required=True, description='Payment creation date')
})

# Render job models
render_job_submission_model = api.model('RenderJobSubmission', {
    'audio_file': fields.String(required=True, description='Audio file (multipart/form-data)'),
    'render_config': fields.Raw(required=True, description='Visualization configuration JSON')
})

render_job_model = api.model('RenderJob', {
    'id': fields.Integer(required=True, description='Job ID'),
    'status': fields.String(required=True, description='Job status', 
                          enum=['queued', 'processing', 'completed', 'failed']),
    'audio_filename': fields.String(description='Original audio filename'),
    'video_url': fields.String(description='Download URL for completed video'),
    'error_message': fields.String(description='Error message if job failed'),
    'created_at': fields.DateTime(required=True, description='Job creation date'),
    'completed_at': fields.DateTime(description='Job completion date')
})

render_job_status_model = api.model('RenderJobStatus', {
    'job_id': fields.Integer(required=True, description='Job ID'),
    'status': fields.String(required=True, description='Current job status'),
    'progress': fields.Integer(description='Job progress percentage (0-100)'),
    'estimated_completion': fields.DateTime(description='Estimated completion time'),
    'message': fields.String(description='Status message')
})

# Health check models
health_check_model = api.model('HealthCheck', {
    'message': fields.String(required=True, description='Service name'),
    'status': fields.String(required=True, description='Overall health status'),
    'service': fields.String(required=True, description='Service identifier'),
    'version': fields.String(required=True, description='Service version'),
    'timestamp': fields.DateTime(required=True, description='Health check timestamp'),
    'environment': fields.String(required=True, description='Environment name'),
    'checks': fields.Raw(required=True, description='Individual service checks')
})

# Create namespaces for different API sections
auth_ns = api.namespace('auth', description='Authentication operations')
payments_ns = api.namespace('payments', description='Payment processing')
jobs_ns = api.namespace('jobs', description='Video rendering jobs')
user_ns = api.namespace('user', description='User management')
health_ns = api.namespace('health', description='Health monitoring')

# Add common error responses to all namespaces
for ns in [auth_ns, payments_ns, jobs_ns, user_ns, health_ns]:
    ns.add_model('Error', error_model)
    ns.add_model('Success', success_model)


@health_ns.route('/')
class HealthCheck(Resource):
    @health_ns.doc('health_check')
    @health_ns.marshal_with(health_check_model)
    @health_ns.response(200, 'Service is healthy')
    @health_ns.response(503, 'Service is degraded', error_model)
    def get(self):
        """Get service health status"""
        pass  # Implementation handled by main routes


# Example documentation for other endpoints (to be expanded)
@auth_ns.route('/register')
class UserRegistration(Resource):
    @auth_ns.doc('register_user')
    @auth_ns.expect(user_registration_model)
    @auth_ns.marshal_with(success_model)
    @auth_ns.response(201, 'User registered successfully')
    @auth_ns.response(400, 'Invalid input', error_model)
    @auth_ns.response(409, 'Email already exists', error_model)
    def post(self):
        """Register a new user account"""
        pass


@auth_ns.route('/login')
class UserLogin(Resource):
    @auth_ns.doc('login_user')
    @auth_ns.expect(user_login_model)
    @auth_ns.marshal_with(token_response_model)
    @auth_ns.response(200, 'Login successful')
    @auth_ns.response(401, 'Invalid credentials', error_model)
    def post(self):
        """Authenticate user and return JWT tokens"""
        pass


@payments_ns.route('/create-session')
class CreatePaymentSession(Resource):
    @payments_ns.doc('create_payment_session')
    @payments_ns.expect(payment_session_model)
    @payments_ns.marshal_with(payment_session_response_model)
    @payments_ns.response(200, 'Payment session created')
    @payments_ns.response(400, 'Invalid payment parameters', error_model)
    @payments_ns.response(401, 'Authentication required', error_model)
    def post(self):
        """Create a Stripe payment session"""
        pass


@jobs_ns.route('/submit')
class SubmitRenderJob(Resource):
    @jobs_ns.doc('submit_render_job')
    @jobs_ns.expect(render_job_submission_model)
    @jobs_ns.marshal_with(render_job_model)
    @jobs_ns.response(201, 'Render job submitted')
    @jobs_ns.response(400, 'Invalid job parameters', error_model)
    @jobs_ns.response(401, 'Authentication required', error_model)
    @jobs_ns.response(402, 'Payment required', error_model)
    def post(self):
        """Submit a video rendering job"""
        pass


@jobs_ns.route('/status/<int:job_id>')
class RenderJobStatus(Resource):
    @jobs_ns.doc('get_render_job_status')
    @jobs_ns.marshal_with(render_job_status_model)
    @jobs_ns.response(200, 'Job status retrieved')
    @jobs_ns.response(404, 'Job not found', error_model)
    @jobs_ns.response(401, 'Authentication required', error_model)
    def get(self, job_id):
        """Get render job status"""
        pass


@user_ns.route('/profile')
class UserProfile(Resource):
    @user_ns.doc('get_user_profile')
    @user_ns.marshal_with(user_profile_model)
    @user_ns.response(200, 'Profile retrieved')
    @user_ns.response(401, 'Authentication required', error_model)
    def get(self):
        """Get user profile information"""
        pass