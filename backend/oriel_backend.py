import os
from app import create_app, db
from app.models import User, Payment, RenderJob
from config import config

# Get configuration from environment
config_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(config[config_name])

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db, 
        'User': User, 
        'Payment': Payment, 
        'RenderJob': RenderJob
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])