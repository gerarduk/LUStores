#!/bin/bash

# Production Diagnosis Script
# Helps diagnose nginx and API issues

echo "=== Production Diagnosis Report ==="
echo "Generated: $(date)"
echo ""

# Test if we can reach the production server
echo "1. Testing production server connectivity..."
if curl -s -o /dev/null -w "%{http_code}" https://py-stores.lancaster.ac.uk/health; then
    echo "✅ Production server is responding"
else
    echo "❌ Cannot reach production server"
fi
echo ""

# Test the enhanced suppliers endpoint directly
echo "2. Testing enhanced suppliers endpoint..."
echo "URL: https://py-stores.lancaster.ac.uk/api/suppliers?withHistory=true"
RESPONSE=$(curl -s -w "%{http_code}" https://py-stores.lancaster.ac.uk/api/suppliers?withHistory=true)
HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)
BODY=$(echo "$RESPONSE" | head -c -4)

echo "HTTP Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Enhanced suppliers endpoint is responding"
    echo "Response preview: $(echo "$BODY" | head -c 200)..."
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "🔐 Authentication required (expected for protected endpoint)"
    echo "Response: $BODY"
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "504" ]; then
    echo "❌ Server error - this suggests nginx error masking is still active!"
    echo "Response: $BODY"
else
    echo "⚠️  Unexpected response code"
    echo "Response: $BODY"
fi
echo ""

# Test basic suppliers endpoint
echo "3. Testing basic suppliers endpoint..."
echo "URL: https://py-stores.lancaster.ac.uk/api/suppliers"
RESPONSE=$(curl -s -w "%{http_code}" https://py-stores.lancaster.ac.uk/api/suppliers)
HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)
BODY=$(echo "$RESPONSE" | head -c -4)

echo "HTTP Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Basic suppliers endpoint is responding"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "🔐 Authentication required"
else
    echo "❌ Error response: $BODY"
fi
echo ""

# Test asset loading
echo "4. Testing asset loading..."
echo "Testing CSS asset..."
ASSET_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://py-stores.lancaster.ac.uk/assets/index.css 2>/dev/null || echo "000")
if [ "$ASSET_RESPONSE" = "200" ]; then
    echo "✅ CSS assets loading correctly"
elif [ "$ASSET_RESPONSE" = "404" ]; then
    echo "❌ CSS assets returning 404 - nginx asset serving issue"
else
    echo "⚠️  CSS asset status: $ASSET_RESPONSE"
fi

echo ""
echo "5. Testing deployment notifications endpoint..."
NOTIF_RESPONSE=$(curl -s -w "%{http_code}" https://py-stores.lancaster.ac.uk/api/notifications/deployments)
HTTP_CODE=$(echo "$NOTIF_RESPONSE" | tail -c 4)
echo "Notifications endpoint status: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correctly requiring authentication"
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "❌ Server error - check backend logs"
fi

echo ""
echo "=== Diagnosis Complete ==="
echo ""
echo "NEXT STEPS:"
echo "1. If you see 502/503 errors: nginx error masking is still active"
echo "2. If you see 401 errors: authentication is working, check frontend auth"
echo "3. If you see 404 for assets: nginx asset serving needs fixing"
echo "4. Check browser Network tab for actual HTTP status codes"
