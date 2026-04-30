#!/bin/bash

# CI/CD Cache and Dependency Diagnostic Script
# This script helps diagnose and fix GitHub Actions cache and dependency issues

set -e

echo "🔍 CI/CD Dependency Diagnostic Script"
echo "====================================="

# Check Node.js and npm versions
echo "📋 Environment Information:"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if package files exist
echo ""
echo "📁 Package Files:"
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
else
    echo "❌ package.json missing"
    exit 1
fi

if [ -f "package-lock.json" ]; then
    echo "✅ package-lock.json exists"
else
    echo "⚠️  package-lock.json missing (this might cause cache issues)"
fi

# Check critical dependencies
echo ""
echo "📦 Critical Dependencies Check:"

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    echo "✅ node_modules directory exists"
    
    # Check specific dependencies
    dependencies=("pg" "drizzle-orm" "jest" "ts-jest" "typescript" "tsx")
    
    for dep in "${dependencies[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo "✅ $dep is installed"
            # Try to get version
            version=$(node -e "console.log(require('$dep/package.json').version)" 2>/dev/null || echo "version unknown")
            echo "   Version: $version"
        else
            echo "❌ $dep is missing"
        fi
    done
else
    echo "❌ node_modules directory missing"
    echo "   Run: npm ci"
fi

# Check database connection dependencies
echo ""
echo "🗄️  Database Dependencies Check:"
node -e "
try {
    const pg = require('pg');
    console.log('✅ pg (node-postgres) is available');
    console.log('   Version:', require('pg/package.json').version);
} catch (error) {
    console.log('❌ pg (node-postgres) not available:', error.message);
}

try {
    const { drizzle } = require('drizzle-orm/node-postgres');
    console.log('✅ drizzle-orm/node-postgres is available');
} catch (error) {
    console.log('❌ drizzle-orm/node-postgres not available:', error.message);
}

try {
    const schema = require('./shared/schema');
    console.log('✅ shared/schema is available');
} catch (error) {
    console.log('❌ shared/schema not available:', error.message);
}
"

# Check Jest configuration
echo ""
echo "🧪 Jest Configuration Check:"
if [ -f "jest.config.js" ]; then
    echo "✅ jest.config.js exists"
    
    # Check if ts-jest is configured
    if grep -q "ts-jest" jest.config.js; then
        echo "✅ ts-jest is configured in jest.config.js"
    else
        echo "❌ ts-jest not found in jest.config.js"
    fi
else
    echo "❌ jest.config.js missing"
fi

# Check if Jest resolver exists
if [ -f "jest.resolver.js" ]; then
    echo "✅ jest.resolver.js exists"
else
    echo "❌ jest.resolver.js missing"
fi

# Check if Jest setup exists
if [ -f "jest.setup.js" ]; then
    echo "✅ jest.setup.js exists"
else
    echo "❌ jest.setup.js missing"
fi

# Check TypeScript configuration
echo ""
echo "📝 TypeScript Configuration Check:"
configs=("tsconfig.json" "tsconfig.test.json" "tsconfig.server.json")

for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ $config exists"
    else
        echo "❌ $config missing"
    fi
done

# Check GitHub Actions cache compatibility
echo ""
echo "🏃 GitHub Actions Cache Compatibility:"
echo "Current OS: $(uname -s)"
echo "Architecture: $(uname -m)"

# Generate cache key similar to GitHub Actions
if [ -f "package-lock.json" ]; then
    cache_key_hash=$(shasum package.json package-lock.json | shasum | cut -d' ' -f1)
    echo "Generated cache key hash: $cache_key_hash"
else
    cache_key_hash=$(shasum package.json | shasum | cut -d' ' -f1)
    echo "Generated cache key hash (no package-lock.json): $cache_key_hash"
fi

# Test basic npm commands
echo ""
echo "🔧 NPM Commands Test:"

# Test npm ci
echo "Testing npm ci..."
if npm ci --dry-run > /dev/null 2>&1; then
    echo "✅ npm ci would succeed"
else
    echo "❌ npm ci would fail"
fi

# Test npx commands
echo "Testing npx commands..."
npx_commands=("tsc" "jest" "tsx" "ts-jest")

for cmd in "${npx_commands[@]}"; do
    if npx "$cmd" --version > /dev/null 2>&1; then
        echo "✅ npx $cmd is available"
    else
        echo "❌ npx $cmd is not available"
    fi
done

# Test database connection (if DATABASE_URL is set)
echo ""
echo "🗄️  Database Connection Test:"
if [ -n "$DATABASE_URL" ]; then
    echo "DATABASE_URL is set: $DATABASE_URL"
    
    # Test basic connection
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.log('❌ Database connection failed:', err.message);
        } else {
            console.log('✅ Database connection successful');
            console.log('   Server time:', res.rows[0].now);
        }
        pool.end();
    });
    " 2>/dev/null || echo "❌ Database connection test failed"
else
    echo "⚠️  DATABASE_URL not set (normal for local development)"
fi

echo ""
echo "🎯 Summary and Recommendations:"
echo "=============================="

# Provide recommendations based on findings
if [ ! -f "package-lock.json" ]; then
    echo "🔧 Run: npm install (to generate package-lock.json)"
fi

if [ ! -d "node_modules" ]; then
    echo "🔧 Run: npm ci (to install dependencies)"
fi

echo "🔧 For GitHub Actions cache issues:"
echo "   - Ensure package-lock.json is committed to the repository"
echo "   - Use 'npm ci' instead of 'npm install' in CI/CD"
echo "   - Use restore-keys in cache configuration for fallback"

echo "🔧 For database issues:"
echo "   - Ensure DATABASE_URL is set in GitHub Actions secrets"
echo "   - Verify PostgreSQL service is running in GitHub Actions"
echo "   - Check that pg and drizzle-orm are properly installed"

echo ""
echo "✅ Diagnostic complete!"
