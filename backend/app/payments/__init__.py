from flask import Blueprint

bp = Blueprint('payments', __name__, url_prefix='/api/payments')

from app.payments import routes