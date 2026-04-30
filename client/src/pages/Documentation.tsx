import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// GitHub Pages documentation base URL
const DOCS_BASE_URL = "https://st7ma784.github.io/LUStores";

export default function Documentation() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Documentation</h1>
        <p className="text-medium-gray">System documentation and API reference</p>
      </div>

      <Tabs defaultValue="user-guide" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="user-guide">User Guide</TabsTrigger>
          <TabsTrigger value="api-docs">API Reference</TabsTrigger>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="mcp">MCP Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="user-guide">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Getting Started
                  <div className="text-sm font-normal">
                    <a 
                      href={`${DOCS_BASE_URL}/quickstart.html`} 
                      target="_blank" 
                      className="text-blue-600 hover:text-blue-800 underline mr-4"
                    >
                      Quick Start Guide →
                    </a>
                    <a 
                      href={`${DOCS_BASE_URL}/tutorials/getting-started.html`} 
                      target="_blank" 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Complete Tutorial →
                    </a>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Dashboard Overview</h4>
                  <p className="text-medium-gray text-sm">
                    The dashboard provides a comprehensive overview of your inventory system including total items, 
                    low stock alerts, total value, and active users. Use the statistics cards to quickly assess 
                    system health and inventory status. Access real-time data and category breakdowns for informed decision making.
                  </p>
                  <div className="mt-2">
                    <a href={`${DOCS_BASE_URL}/user-guide/dashboard.html`} target="_blank" className="text-xs text-blue-600 hover:text-blue-800 underline">
                      Complete Dashboard Guide →
                    </a>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Managing Inventory</h4>
                  <p className="text-medium-gray text-sm">
                    Navigate to the Inventory section to add, edit, and delete items. Use advanced search and filter 
                    functionality to quickly find specific items. Each item includes detailed information such as 
                    SKU, category, current stock, minimum stock threshold, pricing, and full audit history. 
                    Support for bulk operations and CSV import/export.
                  </p>
                  <div className="mt-2">
                    <a href={`${DOCS_BASE_URL}/user-guide/inventory.html`} target="_blank" className="text-xs text-blue-600 hover:text-blue-800 underline">
                      Complete Inventory Guide →
                    </a>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Stock Management</h4>
                  <p className="text-medium-gray text-sm">
                    Update stock levels using the stock adjustment feature with support for stock in, stock out, 
                    and manual adjustments. All stock movements are tracked with full audit trails including the 
                    user who made the change, timestamp, reason for adjustment, and previous/new stock levels.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Sales & Quotes</h4>
                  <p className="text-medium-gray text-sm">
                    Create professional sales quotes with real-time stock validation, customer information tracking, 
                    and automatic total calculation. Generate invoices, export to CSV, and process quotes into sales 
                    with automatic stock deduction and comprehensive reporting.
                  </p>
                  <div className="mt-2">
                    <a href={`${DOCS_BASE_URL}/user-guide/sales-quotes.html`} target="_blank" className="text-xs text-blue-600 hover:text-blue-800 underline">
                      Complete Sales & Quotes Guide →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-search text-blue-600 dark:text-blue-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Advanced Search</p>
                        <p className="text-xs text-medium-gray">Search across names, SKUs, descriptions with real-time filtering</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-chart-line text-green-600 dark:text-green-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Real-time Analytics</p>
                        <p className="text-xs text-medium-gray">Live dashboard with category statistics and trends</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Low Stock Alerts</p>
                        <p className="text-xs text-medium-gray">Automatic notifications when items reach minimum thresholds</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-server text-red-600 dark:text-red-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">System Monitoring</p>
                        <p className="text-xs text-medium-gray">Real-time CPU, memory, and disk monitoring with alerts for admins</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-history text-purple-600 dark:text-purple-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Audit Trail</p>
                        <p className="text-xs text-medium-gray">Complete history of all changes with user attribution</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-file-export text-indigo-600 dark:text-indigo-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Import/Export</p>
                        <p className="text-xs text-medium-gray">Bulk operations with CSV support for data management</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <i className="fas fa-shield-alt text-red-600 dark:text-red-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Role-based Security</p>
                        <p className="text-xs text-medium-gray">Granular permissions with OAuth integration</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-mobile-alt text-teal-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">Mobile Responsive</p>
                        <p className="text-xs text-medium-gray">Full functionality on all devices and screen sizes</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-robot text-pink-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="font-medium">MCP Integration</p>
                        <p className="text-xs text-medium-gray">AI-ready API for chatbot and automation integration</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-medium-gray text-sm mb-4">
                  Items are organized into categories for better management, reporting, and organization. 
                  Each category supports custom icons, colors, and descriptions for visual identification.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <i className="fas fa-laptop text-blue-600 dark:text-blue-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium">IT Equipment</p>
                      <p className="text-xs text-medium-gray">Computers, laptops, networking devices</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <i className="fas fa-paperclip text-green-600 dark:text-green-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium">Office Supplies</p>
                      <p className="text-xs text-medium-gray">Pens, paper, office materials</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <i className="fas fa-book text-orange-600 dark:text-orange-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium">Textbooks</p>
                      <p className="text-xs text-medium-gray">Educational materials and resources</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <i className="fas fa-microscope text-purple-600 dark:text-purple-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium">Laboratory</p>
                      <p className="text-xs text-medium-gray">Scientific equipment and lab supplies</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chair text-yellow-600 dark:text-yellow-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium">Furniture</p>
                      <p className="text-xs text-medium-gray">Desks, chairs, office furniture</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <i className="fas fa-heartbeat text-red-600 dark:text-red-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium">Medical Supplies</p>
                      <p className="text-xs text-medium-gray">Healthcare equipment and supplies</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium mb-2">📚 Documentation</h5>
                    <ul className="space-y-1 text-blue-600">
                      <li><a href={`${DOCS_BASE_URL}/index.html`} target="_blank" className="hover:underline">Complete Documentation Index</a></li>
                      <li><a href={`${DOCS_BASE_URL}/installation.html`} target="_blank" className="hover:underline">Installation & Setup Guide</a></li>
                      <li><a href={`${DOCS_BASE_URL}/configuration.html`} target="_blank" className="hover:underline">System Configuration</a></li>
                      <li><a href={`${DOCS_BASE_URL}/deployment/index.html`} target="_blank" className="hover:underline">Deployment Documentation</a></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">🔧 Development</h5>
                    <ul className="space-y-1 text-blue-600">
                      <li><a href={`${DOCS_BASE_URL}/development/index.html`} target="_blank" className="hover:underline">Developer Documentation</a></li>
                      <li><a href={`${DOCS_BASE_URL}/testing-guide.html`} target="_blank" className="hover:underline">Testing Guide</a></li>
                      <li><a href={`${DOCS_BASE_URL}/reference/index.html`} target="_blank" className="hover:underline">Technical Reference</a></li>
                      <li><a href={`${DOCS_BASE_URL}/explanations/index.html`} target="_blank" className="hover:underline">Architecture Explanations</a></li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    💡 <strong>Tip:</strong> Use the search functionality throughout the system to quickly find items, 
                    users, or specific information. All data is indexed for fast retrieval and filtering.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-docs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  API Endpoints Reference
                  <div className="text-sm font-normal">
                    <a 
                      href={`${DOCS_BASE_URL}/api/overview.html`}
                      target="_blank" 
                      className="text-blue-600 hover:text-blue-800 underline mr-4"
                    >
                      Complete API Documentation →
                    </a>
                    <a 
                      href={`${DOCS_BASE_URL}/api/endpoints.html`}
                      target="_blank" 
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Detailed Endpoint Docs →
                    </a>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">Authentication</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/auth/user</code>
                        <span className="text-muted-foreground">Get current user information</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/login</code>
                        <span className="text-muted-foreground">Initiate OAuth login flow</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/logout</code>
                        <span className="text-muted-foreground">Logout current user</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Dashboard</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/dashboard/stats</code>
                        <span className="text-medium-gray">Get dashboard statistics</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/dashboard/low-stock</code>
                        <span className="text-medium-gray">Get low stock alerts</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/dashboard/category-stats</code>
                        <span className="text-medium-gray">Get category statistics</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Inventory Items</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/items</code>
                        <span className="text-medium-gray">List items with pagination, search, filters</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/items/:id</code>
                        <span className="text-medium-gray">Get specific item details</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/items</code>
                        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs">Manager/Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PATCH /api/items/:id</code>
                        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs">Manager/Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PUT /api/items/:id</code>
                        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs">Manager/Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">DELETE /api/items/:id</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/items/bulk-import</code>
                        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs">Manager/Admin</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Categories</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/categories</code>
                        <span className="text-medium-gray">List all categories</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/categories</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin/Superuser</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PUT /api/categories/:id</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin/Superuser</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PATCH /api/categories/:id</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin/Superuser</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">DELETE /api/categories/:id</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin/Superuser</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Stock Management</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/items/:id/stock</code>
                        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs">Manager/Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/stock-movements</code>
                        <span className="text-medium-gray">Get stock movement history</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Sales & Quotes</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/sales</code>
                        <span className="text-medium-gray">Complete a sale transaction</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/sales/quotes</code>
                        <span className="text-medium-gray">Create a new quote</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/sales/quotes</code>
                        <span className="text-medium-gray">List saved quotes</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/sales/quotes/:id</code>
                        <span className="text-medium-gray">Get specific quote</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PUT /api/sales/quotes/:id</code>
                        <span className="text-medium-gray">Update existing quote</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">DELETE /api/sales/quotes/:id</code>
                        <span className="text-medium-gray">Delete quote</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/sales/quotes/:id/process</code>
                        <span className="text-medium-gray">Convert quote to sale</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/sales/stock-check</code>
                        <span className="text-medium-gray">Validate stock availability</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/sales/reports</code>
                        <span className="text-medium-gray">Generate sales reports</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/sales/low-stock-report</code>
                        <span className="text-medium-gray">Generate low stock report</span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        📖 See detailed documentation: 
                        <a href={`${DOCS_BASE_URL}/api/sales-quotes.html`} target="_blank" className="underline ml-1">
                          Sales & Quotes API Guide →
                        </a>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">User Management</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">GET /api/users</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PATCH /api/users/:id/role</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">POST /api/users/reset-password</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">PATCH /api/admin/reset-password/:id</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-muted px-2 py-1 rounded">DELETE /api/admin/remove-user/:id</code>
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Parameters & Request Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2">Common Query Parameters</h5>
                    <div className="text-sm space-y-1">
                      <p><code className="bg-muted px-1 rounded">page</code> - Page number for pagination (default: 1)</p>
                      <p><code className="bg-muted px-1 rounded">limit</code> - Items per page (default: 10, max: 100)</p>
                      <p><code className="bg-muted px-1 rounded">search</code> - Search term for names, SKUs, descriptions</p>
                      <p><code className="bg-muted px-1 rounded">categoryId</code> - Filter by category ID</p>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Example Requests</h5>
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted p-2 rounded">
                        <code>GET /api/items?search=laptop&page=1&limit=20</code>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <code>GET /api/items?categoryId=1&search=dell</code>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <code>GET /api/sales/reports?startDate=2025-01-01&endDate=2025-01-31</code>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  User Roles & Permissions
                  <a 
                    href={`${DOCS_BASE_URL}/quickstart.html#understanding-your-role`}
                    target="_blank" 
                    className="text-sm font-normal text-blue-600 hover:text-blue-800 underline"
                  >
                    Complete Role Guide →
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Admin</Badge>
                      <span className="text-sm text-medium-gray">Full system access</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Manage all inventory items and categories</li>
                      <li>• Full user management and role assignment</li>
                      <li>• Access to all reports and analytics</li>
                      <li>• System configuration and settings</li>
                      <li>• API access for all endpoints</li>
                      <li>• Password reset and user removal capabilities</li>
                      <li>• Sales transaction management and reporting</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">Superuser</Badge>
                      <span className="text-sm text-medium-gray">Enhanced administrative access</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• All Admin privileges for inventory management</li>
                      <li>• Category creation, modification, and deletion</li>
                      <li>• Advanced reporting and analytics access</li>
                      <li>• Bulk import/export operations</li>
                      <li>• Sales and quotes management</li>
                      <li>• Limited user role management</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Manager</Badge>
                      <span className="text-sm text-medium-gray">Inventory management</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Add, edit, and update inventory items</li>
                      <li>• Manage stock levels and movements</li>
                      <li>• Create and process sales quotes</li>
                      <li>• View and generate reports</li>
                      <li>• Bulk import inventory data</li>
                      <li>• Stock adjustment and audit trail management</li>
                      <li>• Limited API access for inventory operations</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">User</Badge>
                      <span className="text-sm text-medium-gray">Read-only access</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• View inventory items and stock levels</li>
                      <li>• Search and filter inventory data</li>
                      <li>• Access basic reports and dashboards</li>
                      <li>• View sales quotes and stock information</li>
                      <li>• Export data in CSV format</li>
                      <li>• Read-only API access</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role-Based API Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2 flex items-center space-x-2">
                      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs">Admin Only</Badge>
                      <span>Administrative Endpoints</span>
                    </h5>
                    <div className="text-sm text-medium-gray ml-4 space-y-1">
                      <p>• User management (/api/users, /api/admin/*)</p>
                      <p>• Password reset and user removal</p>
                      <p>• Category deletion</p>
                      <p>• System configuration access</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2 flex items-center space-x-2">
                      <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs">Manager+</Badge>
                      <span>Inventory Management</span>
                    </h5>
                    <div className="text-sm text-medium-gray ml-4 space-y-1">
                      <p>• Item creation, modification, deletion</p>
                      <p>• Stock adjustments and movements</p>
                      <p>• Bulk import/export operations</p>
                      <p>• Sales and quote processing</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2 flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800 text-xs">All Users</Badge>
                      <span>Read-Only Access</span>
                    </h5>
                    <div className="text-sm text-medium-gray ml-4 space-y-1">
                      <p>• View inventory and categories</p>
                      <p>• Dashboard statistics and reports</p>
                      <p>• Search and filtering capabilities</p>
                      <p>• Stock status and movement history</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requesting Role Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p className="text-medium-gray">
                    To request elevated permissions or role changes:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-medium-gray">
                    <li>Contact your system administrator</li>
                    <li>Administrator can update your role in the User Management section</li>
                    <li>Changes take effect immediately upon login refresh</li>
                  </ol>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Note:</strong> Role changes are logged for security audit purposes. 
                      Contact your administrator for assistance with role assignments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mcp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Model Context Protocol (MCP) Integration
                <a 
                  href={`${DOCS_BASE_URL}/api/overview.html#mcp-integration`}
                  target="_blank" 
                  className="text-sm font-normal text-blue-600 hover:text-blue-800 underline"
                >
                  Complete MCP Guide →
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Overview</h4>
                  <p className="text-medium-gray text-sm mb-4">
                    The University Inventory System provides MCP-ready API endpoints for seamless chatbot integration. 
                    All endpoints return structured JSON responses with consistent error handling, making it perfect 
                    for AI assistant integration and automated workflows.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">🤖 MCP-Ready Features</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• RESTful API design with predictable endpoints</li>
                      <li>• Structured JSON responses perfect for AI parsing</li>
                      <li>• Comprehensive error handling with descriptive messages</li>
                      <li>• Query parameter support for advanced filtering</li>
                      <li>• Pagination for large data sets</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Authentication for MCP</h4>
                  <p className="text-medium-gray text-sm mb-2">
                    Use session-based authentication with OAuth 2.0 integration:
                  </p>
                  <div className="bg-muted p-3 rounded text-sm font-mono mb-3">
                    # Session-based authentication<br/>
                    Cookie: connect.sid=s%3A...<br/><br/>
                    # For programmatic access<br/>
                    Authorization: Bearer &lt;token&gt;
                  </div>
                  <p className="text-xs text-medium-gray">
                    Authentication flow: /api/login → OAuth redirect → Session creation → API access
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Common MCP Use Cases</h4>
                  <div className="space-y-4">
                    <div className="border border-border p-4 rounded">
                      <h5 className="font-medium mb-2 text-green-700 dark:text-green-400">📦 Inventory Queries</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "What IT equipment do we have in stock?"
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/items?categoryId=1&search=&page=1&limit=50
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Paginated list with names, SKUs, stock levels, prices
                      </p>
                    </div>

                    <div className="border border-border p-4 rounded">
                      <h5 className="font-medium mb-2 text-orange-700 dark:text-orange-400">⚠️ Stock Alerts</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "Which items are low on stock?"
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/dashboard/low-stock
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Items below minimum threshold with current/minimum levels
                      </p>
                    </div>

                    <div className="border border-border p-4 rounded">
                      <h5 className="font-medium mb-2 text-blue-700 dark:text-blue-400">💰 Price Inquiries</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "What's the price of item SKU-123?"
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/items?search=SKU-123
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Item details including current price and stock
                      </p>
                    </div>

                    <div className="border border-border p-4 rounded">
                      <h5 className="font-medium mb-2 text-purple-700 dark:text-purple-400">📊 Dashboard Metrics</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "Give me an overview of our inventory status"
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/dashboard/stats<br/>
                        GET /api/dashboard/category-stats
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Total items, values, low stock counts, category breakdown
                      </p>
                    </div>

                    <div className="border border-border p-4 rounded">
                      <h5 className="font-medium mb-2 text-red-700 dark:text-red-400">🛒 Sales Validation</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "Can I create a quote for 5 laptops and 2 monitors?"
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        POST /api/sales/stock-check<br/>
                        {"{"}"items": [{"{"}"id": 1, "quantity": 5{"}"}, {"{"}"id": 2, "quantity": 2{"}"}]{"}"}
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Availability status, current stock, and pricing for each item
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Advanced Analytics for MCP</h4>
                  <div className="space-y-4">
                    <div className="border border-amber-200 dark:border-amber-800 p-4 rounded bg-amber-50 dark:bg-amber-900/20">
                      <h5 className="font-medium mb-2 text-amber-700 dark:text-amber-400">📈 Charge Code Analytics</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "Which departments are spending the most? Show me charge code summaries."
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/mcp/charge-code-analytics?limit=10&sortBy=totalAmount<br/>
                        GET /api/mcp/charge-code-analytics?startDate=2024-01-01&endDate=2024-12-31
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Department spending analysis, sales counts, average order values
                      </p>
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Parameters: limit, sortBy (totalAmount|salesCount|avgOrderValue), startDate, endDate
                      </div>
                    </div>

                    <div className="border border-emerald-200 dark:border-emerald-800 p-4 rounded bg-emerald-50 dark:bg-emerald-900/20">
                      <h5 className="font-medium mb-2 text-emerald-700 dark:text-emerald-400">🏆 Top Sellers Analysis</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "What are our best-selling items? Show me top performers by revenue."
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/mcp/top-sellers?metric=revenue&limit=15<br/>
                        GET /api/mcp/top-sellers?categoryId=1&metric=quantity&startDate=2024-01-01
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Best-selling items with sales metrics, revenue data, frequency analysis
                      </p>
                      <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                        Parameters: metric (quantity|revenue|frequency), limit, categoryId, startDate, endDate
                      </div>
                    </div>

                    <div className="border border-purple-200 dark:border-purple-800 p-4 rounded bg-purple-50 dark:bg-purple-900/20">
                      <h5 className="font-medium mb-2 text-purple-700 dark:text-purple-400">🏢 Department Performance</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "Give me a comprehensive breakdown of department spending and item usage."
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/mcp/department-performance?includeItemBreakdown=true<br/>
                        GET /api/mcp/department-performance?startDate=2024-01-01&endDate=2024-03-31
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Department-wise performance with optional item-level breakdown
                      </p>
                      <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                        Parameters: includeItemBreakdown (true|false), startDate, endDate
                      </div>
                    </div>

                    <div className="border border-cyan-200 dark:border-cyan-800 p-4 rounded bg-cyan-50 dark:bg-cyan-900/20">
                      <h5 className="font-medium mb-2 text-cyan-700 dark:text-cyan-400">📊 Enhanced Sales Reports</h5>
                      <p className="text-sm text-medium-gray mb-2">
                        "Generate detailed sales reports with department summaries and trends."
                      </p>
                      <code className="text-xs bg-muted p-2 rounded block">
                        GET /api/sales/reports?chargeCode=ENGINEERING&format=json<br/>
                        GET /api/sales/reports?startDate=2024-01-01&endDate=2024-12-31&format=csv
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns: Comprehensive sales data with department analysis and export options
                      </p>
                      <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-400">
                        Enhanced with: Department summaries, spending analytics, CSV export capability
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">MCP Analytics Response Examples</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium mb-2">Charge Code Analytics Response</h5>
                      <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                        {"{"}<br/>
                        &nbsp;&nbsp;"success": true,<br/>
                        &nbsp;&nbsp;"data": {"{"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;"chargeCodeAnalytics": [<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"{"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"chargeCode": "ENGINEERING",<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"salesCount": 15,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalAmount": 25420.50,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"avgOrderValue": 1694.70,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"uniqueItemCount": 8,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalItems": 45<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"}"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;],<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;"summary": {"{"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalChargeCodeCount": 12,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalSalesAmount": 84230.75,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"topPerformer": {"{"}"chargeCode": "ENGINEERING", ...{"}"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;{"}"}<br/>
                        &nbsp;&nbsp;{"}"}<br/>
                        {"}"}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Top Sellers Response</h5>
                      <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                        {"{"}<br/>
                        &nbsp;&nbsp;"success": true,<br/>
                        &nbsp;&nbsp;"data": {"{"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;"topSellers": [<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"{"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"itemId": 15,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"itemName": "Dell Laptop",<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalQuantitySold": 45,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalRevenue": 67500.00,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"salesFrequency": 12,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"avgOrderQuantity": 3.75,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"uniqueChargeCodeCount": 5<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"}"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;],<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;"summary": {"{"}<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalItemsSold": 234,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"totalRevenue": 156780.25,<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"avgOrderValue": 1245.60<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;{"}"}<br/>
                        &nbsp;&nbsp;{"}"}<br/>
                        {"}"}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Advanced MCP Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded">
                      <h5 className="font-medium mb-2">🔍 Smart Search</h5>
                      <p className="text-xs text-medium-gray mb-2">
                        Support for fuzzy search across multiple fields:
                      </p>
                      <code className="text-xs">
                        /api/items?search=dell%20laptop
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Searches names, SKUs, descriptions simultaneously
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded">
                      <h5 className="font-medium mb-2">📈 Analytics</h5>
                      <p className="text-xs text-medium-gray mb-2">
                        Real-time analytics for decision making:
                      </p>
                      <code className="text-xs">
                        /api/sales/reports?format=json
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Returns sales trends, departmental usage
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded">
                      <h5 className="font-medium mb-2">🏷️ Category Filtering</h5>
                      <p className="text-xs text-medium-gray mb-2">
                        Filter by predefined categories:
                      </p>
                      <code className="text-xs">
                        /api/categories → /api/items?categoryId=X
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        First get categories, then filter items
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded">
                      <h5 className="font-medium mb-2">📋 Stock History</h5>
                      <p className="text-xs text-medium-gray mb-2">
                        Track stock movements and changes:
                      </p>
                      <code className="text-xs">
                        /api/stock-movements?itemId=123
                      </code>
                      <p className="text-xs text-medium-gray mt-1">
                        Full audit trail with user attribution
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Error Handling & Response Formats</h4>
                  <p className="text-medium-gray text-sm mb-3">
                    All API responses follow standard HTTP status codes with structured error messages:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium mb-2">Success Responses</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <code className="text-green-600">200 OK</code>
                          <span className="text-medium-gray">Successful request</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="text-green-600">201 Created</code>
                          <span className="text-medium-gray">Resource created</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="text-green-600">204 No Content</code>
                          <span className="text-medium-gray">Successful deletion</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Error Responses</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <code className="text-red-600">401 Unauthorized</code>
                          <span className="text-medium-gray">Authentication required</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="text-red-600">403 Forbidden</code>
                          <span className="text-medium-gray">Insufficient permissions</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="text-red-600">404 Not Found</code>
                          <span className="text-medium-gray">Resource not found</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="text-red-600">400 Bad Request</code>
                          <span className="text-medium-gray">Invalid request data</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-muted p-3 rounded">
                    <h6 className="font-medium text-sm mb-1">Example Error Response:</h6>
                    <code className="text-xs">
                      {"{"}<br/>
                      &nbsp;&nbsp;"message": "Insufficient stock for some items",<br/>
                      &nbsp;&nbsp;"insufficientItems": [{"{"}"itemId": 1, "available": 2, "requested": 5{"}"}]<br/>
                      {"}"}
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Integration Best Practices</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-medium-gray">Always validate stock before creating quotes or sales</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-medium-gray">Use pagination for large datasets to improve performance</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-medium-gray">Include meaningful search terms for better results</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-medium-gray">Handle authentication expiration gracefully</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-medium-gray">Check user permissions before attempting restricted operations</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-500 font-bold">⚡</span>
                      <span className="text-medium-gray">Use date ranges in analytics endpoints to limit data processing</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-yellow-500 font-bold">⚡</span>
                      <span className="text-medium-gray">Cache analytics results when possible - data doesn't change frequently</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 font-bold">📊</span>
                      <span className="text-medium-gray">Combine multiple analytics endpoints for comprehensive insights</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 font-bold">📊</span>
                      <span className="text-medium-gray">Use sortBy parameters to get most relevant results first</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">🎯 MCP Analytics Workflow Example</h5>
                    <div className="text-xs text-blue-700 space-y-2">
                      <p><strong>1.</strong> Get department overview: <code>/api/mcp/department-performance</code></p>
                      <p><strong>2.</strong> Identify top spending department from results</p>
                      <p><strong>3.</strong> Get detailed charge code analytics: <code>/api/mcp/charge-code-analytics?sortBy=totalAmount</code></p>
                      <p><strong>4.</strong> Analyze top sellers for that department: <code>/api/mcp/top-sellers?metric=revenue</code></p>
                      <p><strong>5.</strong> Combine insights for comprehensive reporting and recommendations</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
