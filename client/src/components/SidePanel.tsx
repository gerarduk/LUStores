import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { ItemWithCategory, Category } from "@shared/schema";

interface SidePanelProps {
  lowStockItems: ItemWithCategory[];
  categoryStats: Array<{
    category: Category;
    itemCount: number;
    totalValue: number;
  }>;
  isLoading?: boolean;
}

export default function SidePanel({ lowStockItems, categoryStats, isLoading }: SidePanelProps) {
  const [, setLocation] = useLocation();

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "add-item":
        setLocation("/inventory");
        break;
      case "bulk-import":
        // For now, navigate to inventory where bulk import could be implemented
        setLocation("/inventory");
        break;
      case "export-data":
        setLocation("/reports");
        break;
      case "generate-report":
        setLocation("/reports");
        break;
      default:
        console.log(`Quick action: ${action}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl h-64 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleQuickAction("add-item")}
            >
              <i className="fas fa-plus-circle text-university-blue mr-3"></i>
              Add New Item
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleQuickAction("bulk-import")}
            >
              <i className="fas fa-upload text-success mr-3"></i>
              Bulk Import
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleQuickAction("export-data")}
            >
              <i className="fas fa-download text-medium-gray mr-3"></i>
              Export Data
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleQuickAction("generate-report")}
            >
              <i className="fas fa-chart-line text-warning mr-3"></i>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lowStockItems.length > 0 ? 
              lowStockItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <i className="fas fa-exclamation-triangle text-warning mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal">Low Stock Alert</p>
                    <p className="text-xs text-medium-gray mt-1">
                      {item.name} stock is below minimum threshold
                    </p>
                    <p className="text-xs text-medium-gray mt-1">
                      Current: {item.currentStock} | Min: {item.minimumStock}
                    </p>
                  </div>
                </div>
              )) : 
              <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <i className="fas fa-check-circle text-success mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal">Stock Status</p>
                  <p className="text-xs text-medium-gray mt-1">
                    All items are above minimum stock levels
                  </p>
                  <p className="text-xs text-medium-gray mt-1">
                    Updated: {new Date().toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            }
            {lowStockItems.length > 3 && (
              <div className="text-center">
                <Button variant="link" className="text-university-blue" onClick={() => setLocation('/inventory')}>
                  View all {lowStockItems.length} low stock items →
                </Button>
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">System Update</p>
                <p className="text-xs text-medium-gray mt-1">
                  New features available in inventory management
                </p>
                <p className="text-xs text-medium-gray mt-1">
                  {new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <i className="fas fa-check-circle text-success mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">Backup Completed</p>
                <p className="text-xs text-medium-gray mt-1">
                  Daily database backup completed successfully
                </p>
                <p className="text-xs text-medium-gray mt-1">
                  {new Date().toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} (Today)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Category Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.slice(0, 4).map((stat) => {
              const getCategoryColor = () => {
                const colorMap: Record<string, string> = {
                  blue: "category-blue",
                  green: "category-green",
                  orange: "category-orange",
                  purple: "category-purple",
                  brown: "category-brown",
                };
                return colorMap[stat.category?.color] || "bg-gray-100 text-gray-600";
              };

              return (
                <div key={stat.category?.id || `stat-${Math.random()}`} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${getCategoryColor()} rounded-lg flex items-center justify-center`}>
                      <i className={`${stat.category?.icon || 'fas fa-box'} text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal">{stat.category?.name || 'Unknown Category'}</p>
                      <p className="text-xs text-medium-gray">
                        {stat.itemCount === 1 ? '1 item' : `${stat.itemCount} items`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-success">
                    £{stat.totalValue.toLocaleString()}
                  </span>
                </div>
              );
            })}

            {categoryStats.length === 0 && (
              <p className="text-center text-medium-gray py-4">No categories found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
