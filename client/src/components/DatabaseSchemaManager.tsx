import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DatabaseSchemaViewer from './DatabaseSchemaViewer';
import DatabaseERD from './DatabaseERD';

const DatabaseSchemaManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Schema Manager</h1>
        <p className="text-gray-600 mt-2">
          Visualize database structure, relationships, and migration dependencies to ensure proper migration order.
        </p>
      </div>

      <Tabs defaultValue="erd" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="erd">Entity Relationship Diagram</TabsTrigger>
          <TabsTrigger value="schema">Schema Details</TabsTrigger>
          <TabsTrigger value="migration">Migration Guide</TabsTrigger>
        </TabsList>
        
        <TabsContent value="erd" className="mt-6">
          <DatabaseERD />
        </TabsContent>
        
        <TabsContent value="schema" className="mt-6">
          <DatabaseSchemaViewer />
        </TabsContent>
        
        <TabsContent value="migration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-route"></i>
                <span>Database Migration Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  <i className="fas fa-info-circle mr-2"></i>
                  Migration Strategy Overview
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    Database migrations must follow dependency order to maintain referential integrity. 
                    Tables with foreign keys depend on the tables they reference.
                  </p>
                  <p>
                    The interconnected nature of this schema means that data migration requires careful coordination 
                    between related tables to avoid constraint violations.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <i className="fas fa-layer-group text-green-600"></i>
                      <span>Independent Tables (Migrate First)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                        <i className="fas fa-users text-green-600"></i>
                        <span className="font-mono">users</span>
                        <span className="text-xs text-green-600">- No dependencies</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        The users table has no foreign key dependencies and serves as the foundation 
                        for most other tables. Migrate this first.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <i className="fas fa-link text-blue-600"></i>
                      <span>Core Reference Tables</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                        <i className="fas fa-sticky-note text-blue-600"></i>
                        <span className="font-mono">notes</span>
                        <span className="text-xs text-blue-600">- Depends on users</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                        <i className="fas fa-tags text-blue-600"></i>
                        <span className="font-mono">categories</span>
                        <span className="text-xs text-blue-600">- Depends on notes</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                        <i className="fas fa-truck text-blue-600"></i>
                        <span className="font-mono">suppliers</span>
                        <span className="text-xs text-blue-600">- Depends on notes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                    <span>Complex Dependencies</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className="fas fa-box text-yellow-600"></i>
                        <span className="font-mono font-semibold">items</span>
                        <span className="text-sm text-yellow-600">- High interconnectivity</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        The items table is central to the system and has multiple foreign key relationships:
                      </p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        <li>• References categories, users (created_by, updated_by), and notes</li>
                        <li>• Referenced by sale_items, quote_items, order_items, stock_movements, sources</li>
                        <li>• Recently added: unit and location fields for better inventory tracking</li>
                      </ul>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className="fas fa-key text-purple-600"></i>
                        <span className="font-mono font-semibold">charge_code_assignments</span>
                        <span className="text-sm text-purple-600">- Permission system table</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        This table manages which charge codes users are authorized to use (permission system):
                      </p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        <li>• Depends on users and chargecodes tables</li>
                        <li>• user_id references users (which user is assigned)</li>
                        <li>• charge_code references chargecodes (which code they can use)</li>
                        <li>• assigned_by references users (who made the assignment)</li>
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className="fas fa-ban text-red-600"></i>
                        <span className="font-mono font-semibold">charge_code_exclusions</span>
                        <span className="text-sm text-red-600">- Most complex dependencies</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        This table has the most foreign key dependencies and should be migrated last:
                      </p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        <li>• Depends on chargecodes, categories, items, and users</li>
                        <li>• Must wait for all referenced tables to be populated</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <i className="fas fa-clipboard-check text-purple-600"></i>
                    <span>Migration Best Practices</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-purple-700">Before Migration</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>✓ Backup existing data</li>
                        <li>✓ Verify source data integrity</li>
                        <li>✓ Map field transformations (e.g., new unit/location fields)</li>
                        <li>✓ Identify missing foreign key references</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-purple-700">During Migration</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>✓ Follow dependency order strictly</li>
                        <li>✓ Handle NULL foreign keys gracefully</li>
                        <li>✓ Set default values for new fields (unit = 'pieces')</li>
                        <li>✓ Validate constraints at each step</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-lightbulb text-amber-600 mt-1"></i>
                  <div>
                    <h3 className="font-semibold text-amber-800">Recent Schema Changes</h3>
                    <div className="text-sm text-amber-700 mt-2 space-y-2">
                      <p>
                        <strong>Items Table:</strong> Added <code>unit</code> (for quantity measurements)
                        and <code>location</code> (for physical location tracking). These additions improve inventory
                        management but require consideration during data migration from legacy systems.
                      </p>
                      <p>
                        <strong>Permission System:</strong> Added <code>charge_code_assignments</code> table to implement
                        three-tier permission system. This enables fine-grained control over which charge codes users
                        can access. Basic users are restricted to assigned codes only, while managers and admins have
                        full access. The table has foreign keys to both users (user_id, assigned_by) and chargecodes
                        (charge_code).
                      </p>
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
};

export default DatabaseSchemaManager;