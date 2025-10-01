from flask import Blueprint

bp = Blueprint('admin_api', __name__)

from app.admin import routes