# Test cleanup script for Docker environment (PowerShell)
# This script ensures a clean test environment by removing persistent volumes

Write-Host "🧹 Cleaning up test environment..." -ForegroundColor Yellow

# Stop and remove test containers
Write-Host "Stopping test containers..." -ForegroundColor Blue
docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>$null
docker-compose -f docker-compose.yml down -v --remove-orphans 2>$null

# Remove test-specific volumes
Write-Host "Removing test volumes..." -ForegroundColor Blue
docker volume rm lustores-test_test_postgres_data 2>$null
docker volume rm lustores_test_postgres_data 2>$null

# Remove any orphaned test containers
Write-Host "Removing orphaned containers..." -ForegroundColor Blue
docker container prune -f 2>$null

# Remove any test images if needed
Write-Host "Removing test images..." -ForegroundColor Blue
docker image prune -f 2>$null

Write-Host "✅ Test environment cleanup completed" -ForegroundColor Green

# Run the tests with fresh environment
Write-Host "🚀 Starting fresh test environment..." -ForegroundColor Green
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
