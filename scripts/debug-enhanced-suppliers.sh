#!/bin/bash

# Enhanced Suppliers API Debug Tool
# This will test the API endpoint and show you exactly what error is being returned

echo "=== Enhanced Suppliers API Debug ==="
echo "Testing the actual API endpoint that's failing..."
echo ""

# Test the endpoint with proper headers (simulating browser request)
echo "1. Testing enhanced suppliers endpoint with curl..."
echo "URL: https://py-stores.lancaster.ac.uk/api/suppliers?withHistory=true"
echo ""

# Use -v for verbose output to see the full HTTP response
curl -v -X GET "https://py-stores.lancaster.ac.uk/api/suppliers?withHistory=true" \
  -H "Accept: application/json" \
  -H "User-Agent: Debug-Tool/1.0" \
  2>&1 | tee /tmp/enhanced-suppliers-debug.log

echo ""
echo "=== Full Response Details ==="
echo "Check /tmp/enhanced-suppliers-debug.log for complete details"
echo ""

# Parse the response to see if it's HTML (nginx error page) or JSON
echo "2. Analyzing response type..."
RESPONSE_TYPE=$(curl -s -I "https://py-stores.lancaster.ac.uk/api/suppliers?withHistory=true" | grep -i "content-type" | cut -d' ' -f2-)
echo "Content-Type: $RESPONSE_TYPE"

if echo "$RESPONSE_TYPE" | grep -q "text/html"; then
    echo "❌ Response is HTML - this suggests nginx is returning an error page"
    echo "   This means our nginx error masking fixes haven't taken effect yet!"
elif echo "$RESPONSE_TYPE" | grep -q "application/json"; then
    echo "✅ Response is JSON - backend is responding"
    echo "   The error might be in the JSON content itself"
else
    echo "⚠️  Unexpected content type: $RESPONSE_TYPE"
fi

echo ""
echo "3. Testing basic suppliers endpoint for comparison..."
curl -s -I "https://py-stores.lancaster.ac.uk/api/suppliers" | grep -i "content-type"

echo ""
echo "=== Next Steps ==="
echo "1. If you see HTML responses: nginx error masking is still active"
echo "2. If you see JSON responses: check the JSON content for error details"
echo "3. Check production server logs: docker logs <container-name>"
echo "4. SSH to production and run: docker ps to see running containers"
