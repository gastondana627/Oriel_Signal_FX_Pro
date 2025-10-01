# Use an official, lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy your entire project's code into the container
COPY . .

# Define the command to run your app
# This will use the PORT environment variable provided by Railway
CMD gunicorn app:app --chdir backend -b 0.0.0.0:$PORT