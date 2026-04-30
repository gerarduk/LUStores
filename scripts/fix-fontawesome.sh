#!/bin/bash

# FontAwesome Font Fix Script
# This script rebuilds the application with proper font handling

echo "🔧 Fixing FontAwesome font issues..."

# Clean previous builds
echo "🗑️ Cleaning previous builds..."
rm -rf dist/
rm -rf client/dist/
rm -rf node_modules/.vite/

# Reinstall FontAwesome to ensure clean files
echo "📦 Reinstalling FontAwesome..."
npm uninstall @fortawesome/fontawesome-free
npm install @fortawesome/fontawesome-free@^6.7.2

# Rebuild the application
echo "🔨 Rebuilding application with proper font handling..."
npm run build

# Verify font files exist
echo "🔍 Verifying font files..."
WEBFONTS_DIR="dist/public/webfonts"

if [ -d "$WEBFONTS_DIR" ]; then
    echo "✅ WebFonts directory found: $WEBFONTS_DIR"
    ls -la "$WEBFONTS_DIR"
    
    # Check for corrupted files
    for font in "$WEBFONTS_DIR"/*.{woff2,woff,ttf}; do
        if [ -f "$font" ]; then
            size=$(stat -f%z "$font" 2>/dev/null || stat -c%s "$font" 2>/dev/null)
            if [ "$size" -lt 1000 ]; then
                echo "⚠️ Potentially corrupted font file: $font (size: ${size} bytes)"
            else
                echo "✅ Font file OK: $(basename "$font") (${size} bytes)"
            fi
        fi
    done
else
    echo "❌ WebFonts directory not found! Fonts may not be properly copied."
fi

echo "🚀 Font fix complete! Please redeploy your application."
