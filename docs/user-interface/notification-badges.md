# Notification Badges System

## Overview

The LUStores application displays dynamic notification badges in the top navigation bar to alert users about important system events and inventory conditions.

## Notification Types

### 1. System Monitoring Alerts (Server Icon)
- **Purpose**: Displays real-time system health and operational alerts
- **API Endpoint**: `/api/system/alerts`
- **Refresh Interval**: 30 seconds
- **Badge Display**: 
  - Shows red badge when `hasSystemAlerts: true`
  - Displays count from `alertCount` field in API response
  - Shows "99+" for counts over 99
  - Tooltip shows detailed alert messages

### 2. Low Stock Notifications (Bell Icon)
- **Purpose**: Alerts users when inventory items are running low
- **API Endpoint**: `/api/dashboard/low-stock`
- **Badge Display**:
  - Shows red badge when low stock items exist
  - Displays count of low stock items
  - Shows "99+" for counts over 99
  - Tooltip shows "X low stock items" or "No low stock alerts"

## Historical Issue: Hard-coded Badge Number

### Problem
Previously, a hard-coded notification badge displaying the number "3" was present in the application due to a legacy backup file (`TopBar.jsx.backup`) that contained:

```jsx
<Badge className="...">
  3
</Badge>
```

### Solution
- **Fixed**: July 10, 2025
- **Action Taken**: Removed the backup file containing hard-coded value
- **Current Status**: All notification badges now use dynamic data from API endpoints

### Technical Details

The notification system is implemented in `/client/src/components/TopBar.tsx`:

```tsx
// System alerts from API
const { data: systemAlerts } = useQuery<{
  alertCount: number;
  alerts: Array<{ type: string; level: string; message: string }>;
  hasSystemAlerts: boolean;
}>({
  queryKey: ["/api/system/alerts"],
  refetchInterval: 30000,
});

// Low stock items from API
const { data: lowStockItems } = useQuery<any[]>({
  queryKey: ["/api/dashboard/low-stock"],
});

const systemAlertCount = systemAlerts?.alertCount || 0;
const lowStockCount = Array.isArray(lowStockItems) ? lowStockItems.length : 0;
```

## Configuration

### API Response Format

**System Alerts** (`/api/system/alerts`):
```json
{
  "alertCount": 7646,
  "alerts": [
    {
      "type": "performance",
      "level": "warning", 
      "message": "High CPU usage detected"
    }
  ],
  "hasSystemAlerts": true
}
```

**Low Stock Items** (`/api/dashboard/low-stock`):
```json
[
  {
    "id": 1,
    "name": "Item Name",
    "current_quantity": 2,
    "minimum_threshold": 10
  }
]
```

## Troubleshooting

### Badge Not Updating
1. Check API endpoints are responding correctly
2. Verify 30-second refresh interval for system alerts
3. Check browser network tab for failed requests
4. Ensure proper authentication for API access

### Incorrect Badge Count
1. Verify API response data structure matches expected format
2. Check that `alertCount` field is present in system alerts response
3. Ensure low stock items array is properly formatted
4. Review any caching configurations that might affect real-time updates

## Development Notes

- All notification badges use React Query for data fetching
- System alerts refresh every 30 seconds automatically
- Low stock data refreshes based on React Query's default behavior
- Badge styling uses Tailwind CSS classes for consistent appearance
- Badge colors: Red for both system alerts and low stock warnings
