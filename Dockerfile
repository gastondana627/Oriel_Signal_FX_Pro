# Use an official, lightweight Python image
FROM python:3.10-slim

# Install system dependencies for FFmpeg and Playwright
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    gnupg \
    # ... (all other system dependencies) ...
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN python -m playwright install chromium

# Copy your entire project's code into the container
COPY . .

# Define the command to run your app
CMD gunicorn backend.app:app -b 0.0.0.0:$PORT