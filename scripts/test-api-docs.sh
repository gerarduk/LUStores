#!/bin/bash

# Test API Documentation Generation
# This script tests that TypeDoc can generate API documentation locally

set -e

echo "🔧 Testing API Documentation Generation"
echo "======================================="

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if npm is available
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if TypeDoc is available
if ! npx typedoc --version >/dev/null 2>&1; then
    echo "📦 Installing TypeDoc..."
    npm install --no-save typedoc@^0.28.3
fi

echo "✅ TypeDoc available"

# Create output directory
mkdir -p docs/_build/html/api

# Generate API documentation
echo "📚 Generating API documentation..."
if npx typedoc --options typedoc.json; then
    echo "✅ API documentation generated successfully"
    
    # Check if index.html was created
    if [ -f "docs/_build/html/api/index.html" ]; then
        echo "✅ API documentation index.html created"
        echo "📄 File size: $(du -h docs/_build/html/api/index.html | cut -f1)"
        echo "📁 Output directory: docs/_build/html/api/"
        echo "🌐 To view locally: open docs/_build/html/api/index.html"
        echo "🌐 GitHub Pages URL: https://st7ma784.github.io/LUStores/api/index.html"
    else
        echo "❌ API documentation index.html not found"
        exit 1
    fi
else
    echo "❌ API documentation generation failed"
    exit 1
fi

echo ""
echo "🎉 API documentation test completed successfully!"
echo "📋 Summary:"
echo "   - TypeDoc configuration: typedoc.json"
echo "   - API README: API_README.md"
echo "   - Output directory: docs/_build/html/api/"
echo "   - Main file: docs/_build/html/api/index.html"
echo "   - GitHub Pages: https://st7ma784.github.io/LUStores/api/index.html"
