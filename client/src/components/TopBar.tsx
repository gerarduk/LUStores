import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import DeploymentNotifications from "@/components/DeploymentNotifications";

// Low stock item type
interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
}

export default function TopBar() {
  const [location, setLocation] = useLocation();

  // Fetch low stock items for notification badge
  const { data: lowStockItems } = useQuery<LowStockItem[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  // Fetch system alerts for system monitoring badge
  const { data: systemAlerts } = useQuery<{
    alertCount: number;
    alerts: Array<{ type: string; level: string; message: string }>;
    hasSystemAlerts: boolean;
  }>({
    queryKey: ["/api/system/alerts"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time monitoring
  });

  const lowStockCount = Array.isArray(lowStockItems) ? lowStockItems.length : 0;
  const systemAlertCount = systemAlerts?.alertCount || 0;
  const hasSystemAlerts = systemAlerts?.hasSystemAlerts || false;

  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/inventory":
        return "Inventory Management";
      case "/users":
        return "User Management";
      case "/reports":
        return "Reports & Analytics";
      case "/documentation":
        return "Documentation";
      default:
        return "Dashboard";
    }
  };

  const getBreadcrumbs = () => {
    switch (location) {
      case "/":
        return [{ label: "Home", active: false }, { label: "Dashboard", active: true }];
      case "/inventory":
        return [{ label: "Home", active: false }, { label: "Inventory", active: true }];
      case "/users":
        return [{ label: "Home", active: false }, { label: "Users", active: true }];
      case "/reports":
        return [{ label: "Home", active: false }, { label: "Reports", active: true }];
      case "/documentation":
        return [{ label: "Home", active: false }, { label: "Documentation", active: true }];
      default:
        return [{ label: "Home", active: true }];
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-charcoal">{getPageTitle()}</h2>
          <nav className="text-sm text-medium-gray">
            {getBreadcrumbs().map((crumb, index) => (
              <span key={index}>
                {index > 0 && " / "}
                <span className={crumb.active ? "text-charcoal" : ""}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Deployment Notifications */}
          <DeploymentNotifications />

          {/* System Monitoring Alerts */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative" 
            onClick={() => setLocation("/system")}
            title={
              hasSystemAlerts 
                ? `${systemAlertCount} system alert${systemAlertCount !== 1 ? 's' : ''}: ${systemAlerts?.alerts.map(a => a.message).join(', ')} - Click to view system management`
                : "System status normal - Click to view system management"
            }
          >
            <i className={`fas fa-server text-lg ${hasSystemAlerts ? 'text-red-500' : 'text-medium-gray'}`}></i>
            {hasSystemAlerts && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center p-0">
                {systemAlertCount > 99 ? "99+" : systemAlertCount}
              </Badge>
            )}
          </Button>
          
          {/* Low Stock Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative" 
            onClick={() => setLocation("/inventory")}
            title={lowStockCount > 0 ? `${lowStockCount} low stock items - Click to view inventory` : "No low stock alerts - Click to view inventory"}
          >
            <i className="fas fa-bell text-lg text-medium-gray"></i>
            {lowStockCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-error text-white text-xs flex items-center justify-center p-0">
                {lowStockCount > 99 ? "99+" : lowStockCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
