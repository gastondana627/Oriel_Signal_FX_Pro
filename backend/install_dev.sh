#!/bin/bash

echo "🚀 Installing Oriel Backend Development Dependencies"
echo "=================================================="

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip first."
    exit 1
fi

echo "✅ Python 3 and pip3 found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install core dependencies first
echo "📚 Installing core Flask dependencies..."
pip install Flask==2.3.3
pip install Flask-CORS==4.0.0
pip install requests

# Try to install all dependencies
echo "📦 Installing all dependencies..."
if pip install -r requirements.txt; then
    echo "✅ All dependencies installed successfully!"
else
    echo "⚠️  Some dependencies failed to install, but core Flask should work"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "To start the development server:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run simple dev server: python run_dev_server.py"
echo "  3. Or run full server: python oriel_backend.py"
echo ""
echo "Test the server with: python ../test_localhost.py"