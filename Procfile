web: cd backend && python -m flask db upgrade && gunicorn oriel_backend:app -b 0.0.0.0:$PORT --workers=2 --timeout=120 --access-logfile=- --error-logfile=- --preload
worker: cd backend && python worker.py
release: cd backend && python -m flask db upgrade