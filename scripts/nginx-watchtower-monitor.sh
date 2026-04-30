#!/bin/sh

# Monitor for app container changes and reload nginx when detected
# This prevents 502 errors when Watchtower updates the app container

echo "Starting nginx-watchtower monitor..."
echo "Monitoring app container for IP changes..."

# Get initial app container IP
get_app_ip() {
    getent hosts app | awk '{ print $1 }' | head -n1
}

LAST_IP=$(get_app_ip)
echo "Initial app IP: ${LAST_IP}"

# Monitor loop - check every 10 seconds
while true; do
    sleep 10

    CURRENT_IP=$(get_app_ip)

    # If IP changed, reload nginx
    if [ "$CURRENT_IP" != "$LAST_IP" ] && [ -n "$CURRENT_IP" ]; then
        echo "🔄 App container IP changed: ${LAST_IP} -> ${CURRENT_IP}"
        echo "⚡ Reloading nginx to pick up new IP..."

        # Test config before reload
        if nginx -t 2>/dev/null; then
            nginx -s reload
            echo "✅ Nginx reloaded successfully"
        else
            echo "⚠️  Nginx config test failed, skipping reload"
        fi

        LAST_IP=$CURRENT_IP
    fi
done
