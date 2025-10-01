# Use an official, lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    gnupg \
    libmagic1 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app

# Set the working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (only Chromium for production)
RUN python -m playwright install chromium --with-deps

# Copy the application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/backend/uploads /app/backend/logs

# Change ownership to app user
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Run the application
CMD ["sh", "-c", "cd backend && python -m flask db upgrade && gunicorn oriel_backend:app -b 0.0.0.0:$PORT --workers=2 --timeout=120 --access-logfile=- --error-logfile=-"]