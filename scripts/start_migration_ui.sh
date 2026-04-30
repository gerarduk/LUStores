#!/bin/bash

# Flask Migration UI Startup Script
# This script sets up and starts the interactive migration interface

echo "🚀 Starting Flask Migration UI..."

# Check if virtual environment exists
if [ ! -d "venv_migration" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv_migration
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv_migration/bin/activate

# Install requirements
echo "📋 Installing Flask requirements..."
pip install -r flask_migration_requirements.txt

# Set Flask environment variables
export FLASK_APP=migration_ui.py
export FLASK_ENV=development
export FLASK_DEBUG=1

echo "🌐 Starting Flask Migration UI on http://localhost:5001"
echo "📊 Navigate to the URL above to begin interactive migration"
echo "⚡ Press Ctrl+C to stop the server"
echo ""

# Start Flask application
python migration_ui.py
