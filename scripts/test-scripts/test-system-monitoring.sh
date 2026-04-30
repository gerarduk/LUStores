#!/bin/bash

echo "Testing System Monitoring Alerts..."
echo "=================================="

# Wait for the application to be ready
echo "Waiting for application to start..."
sleep 5

# Test the system alerts endpoint
echo "Testing /api/system/alerts endpoint..."
curl -s http://localhost:5000/api/system/alerts \
  -H "Content-Type: application/json" \
  | jq '.' || echo "Failed to reach system alerts endpoint"

echo ""
echo "To test in the UI:"
echo "1. Open http://localhost:5000 in your browser"
echo "2. Login with your credentials"
echo "3. Look for the server icon (📊) next to the bell icon in the top bar"
echo "4. If system resources are over 90%, you'll see a red badge with the alert count"
echo "5. Hover over the server icon to see detailed alert information"

echo ""
echo "System monitoring features added:"
echo "- Real-time CPU, Memory, and Disk monitoring"
echo "- Alerts when any resource exceeds 90%"
echo "- Badge notifications in the TopBar"
echo "- Automatic refresh every 30 seconds"
echo "- Detailed tooltips with alert information"
