# FontAwesome Font Fix Script (PowerShell)
# This script rebuilds the application with proper font handling

Write-Host "🔧 Fixing FontAwesome font issues..." -ForegroundColor Cyan

# Clean previous builds
Write-Host "🗑️ Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "dist"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "client\dist"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "node_modules\.vite"

# Reinstall FontAwesome to ensure clean files
Write-Host "📦 Reinstalling FontAwesome..." -ForegroundColor Yellow
npm uninstall @fortawesome/fontawesome-free
npm install @fortawesome/fontawesome-free@^6.7.2

# Rebuild the application
Write-Host "🔨 Rebuilding application with proper font handling..." -ForegroundColor Yellow
npm run build

# Verify font files exist
Write-Host "🔍 Verifying font files..." -ForegroundColor Yellow
$webfontsDir = "dist\public\webfonts"

if (Test-Path $webfontsDir) {
    Write-Host "✅ WebFonts directory found: $webfontsDir" -ForegroundColor Green
    Get-ChildItem $webfontsDir | Format-Table Name, Length, LastWriteTime
    
    # Check for corrupted files
    Get-ChildItem $webfontsDir -Include "*.woff2", "*.woff", "*.ttf" | ForEach-Object {
        if ($_.Length -lt 1000) {
            Write-Host "⚠️ Potentially corrupted font file: $($_.Name) (size: $($_.Length) bytes)" -ForegroundColor Red
        } else {
            Write-Host "✅ Font file OK: $($_.Name) ($($_.Length) bytes)" -ForegroundColor Green
        }
    }
} else {
    Write-Host "❌ WebFonts directory not found! Fonts may not be properly copied." -ForegroundColor Red
}

Write-Host "🚀 Font fix complete! Please redeploy your application." -ForegroundColor Green
