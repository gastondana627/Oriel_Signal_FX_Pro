# Oriel Signal FX Pro - Backend

Backend infrastructure for the Oriel Signal FX Pro audio visualizer application.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py          # Flask application factory
│   ├── models.py            # Database models
│   └── main/
│       ├── __init__.py      # Main blueprint
│       └── routes.py        # Main routes
├── config.py                # Configuration management
├── oriel_backend.py         # Application entry point
├── requirements.txt         # Python dependencies
├── Procfile                 # Railway deployment configuration
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Setup Instructions

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

4. **Initialize database:**
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

5. **Run the application:**
   ```bash
   python oriel_backend.py
   ```

## Environment Variables

See `.env.example` for required environment variables.

## Deployment

This application is configured for deployment on Railway. The `Procfile` defines both web and worker processes.

## API Endpoints

- `GET /` - Health check endpoint
- `GET /health` - Health check endpoint

Additional endpoints will be added in subsequent development phases.