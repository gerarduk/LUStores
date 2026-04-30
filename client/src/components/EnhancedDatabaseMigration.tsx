import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import MigrationSchemaAnalysis from '@/components/MigrationSchemaAnalysis';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Settings, 
  Eye, 
  Play,
  RefreshCw,
  Shield,
  Loader2,
  Download
} from 'lucide-react';

interface DatabaseConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

interface TableMapping {
  [legacyTable: string]: string[];
}

interface ColumnMapping {
  [legacyTable: string]: {
    [targetTable: string]: {
      [legacyColumn: string]: {
        target_column: string | null;
        confidence: 'high' | 'medium' | 'low' | 'none';
        type_conversion: {
          required: boolean;
          from_type?: string;
          to_type?: string;
          function?: string;
        } | null;
      };
    };
  };
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  primary_key?: boolean;
  foreign_key?: {
    table: string;
    column: string;
  };
}

interface SchemaInfo {
  [tableName: string]: {
    columns: ColumnInfo[];
    sample_data?: Record<string, unknown>[];
    row_count?: number;
    foreign_keys?: Array<{
      column: string;
      references_table: string;
      references_column: string;
    }>;
  };
}

interface PreviewData {
  legacy_table: string;
  raw_data: Record<string, unknown>[];
  transformed_data: { [targetTable: string]: Record<string, unknown>[] };
  warnings: string[];
  errors: string[];
}

interface ColumnMapping {
  [legacyColumn: string]: {
    target_column: string | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    type_conversion: {
      required: boolean;
      from_type?: string;
      to_type?: string;
      function?: string;
    } | null;
  };
}

interface MigrationPlan {
  tables: Array<{
    legacy_table: string;
    target_tables: string[];
    row_count: number;
    estimated_time_seconds: number;
    column_mappings: ColumnMapping;
    has_manual_edits: boolean;
    foreign_keys: Array<{
      column: string;
      references_table: string;
      references_column: string;
    }>;
  }>;
  total_estimated_time: number;
  total_records: number;
  dependencies: Record<string, string[]>;
  warnings: string[];
}

export default function EnhancedDatabaseMigration() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Connection states
  const [mariadbConfig, setMariadbConfig] = useState<DatabaseConnection>({
    host: 'py-it.lancaster.ac.uk',
    port: '3306',
    user: 'PhysicsStores',
    password: '',
    database: 'physicsstores'
  });
  
  const [postgresqlConfig, setPostgresqlConfig] = useState<DatabaseConnection>({
    host: 'localhost',
    port: '5432',
    user: 'postgres',
    password: '',
    database: 'lustores'
  });

  const [connectionStatus, setConnectionStatus] = useState<{
    mariadb: 'idle' | 'testing' | 'connected' | 'failed';
    postgresql: 'idle' | 'testing' | 'connected' | 'failed';
  }>({
    mariadb: 'idle',
    postgresql: 'idle'
  });

  // Schema states
  const [legacySchema, setLegacySchema] = useState<SchemaInfo>({});
  const [targetSchema, setTargetSchema] = useState<SchemaInfo>({});
  
  // Mapping states
  const [tableMappings, setTableMappings] = useState<TableMapping>({});
  const [columnMappings, setColumnMappings] = useState<ColumnMapping>({});
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, ColumnMapping> | null>(null);
  
  // Preview and editing states
  const [previewData, setPreviewData] = useState<{ [table: string]: PreviewData }>({});
  const [selectedPreviewTable, setSelectedPreviewTable] = useState<string>('');
  
  // Migration execution states
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'planning' | 'ready' | 'running' | 'completed' | 'failed'>('idle');
  const [migrationProgress, setMigrationProgress] = useState(0);

  // Active tab
  const [activeTab, setActiveTab] = useState('connection');

  // Test database connection
  const testConnection = async (type: 'mariadb' | 'postgresql') => {
    const config = type === 'mariadb' ? mariadbConfig : postgresqlConfig;
    
    setConnectionStatus(prev => ({ ...prev, [type]: 'testing' }));
    
    try {
      const response = await fetch('/api/migration/connection/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ type, config }),
      });

      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }));
        
        if (type === 'mariadb') {
          setLegacySchema(result.schema || {});
        } else {
          setTargetSchema(result.schema || {});
        }
        
        toast({
          title: "Connection Successful",
          description: `Connected to ${type.toUpperCase()}: ${result.tables_found} tables found`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [type]: 'failed' }));
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Generate mapping suggestions
  const generateSuggestions = async () => {
    if (connectionStatus.mariadb !== 'connected' || connectionStatus.postgresql !== 'connected') {
      toast({
        title: "Connection Required",
        description: "Please connect to both databases first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/migration/mappings/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        setSuggestedMappings(result);
        setTableMappings(result.table_mappings || {});
        setColumnMappings(result.column_mappings || {});
        
        toast({
          title: "Suggestions Generated",
          description: "AI-powered mapping suggestions have been created",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Suggestion Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Preview data transformation
  const previewTableData = async (legacyTable: string) => {
    try {
      const response = await fetch('/api/migration/data/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ table: legacyTable, limit: 10 }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setPreviewData(prev => ({ ...prev, [legacyTable]: result }));
        setSelectedPreviewTable(legacyTable);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Create migration plan
  const createMigrationPlan = async () => {
    setMigrationStatus('planning');
    
    try {
      // Save current mappings first
      await fetch('/api/migration/mappings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          table_mappings: tableMappings,
          column_mappings: columnMappings,
        }),
      });

      // Create migration plan
      const response = await fetch('/api/migration/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        setMigrationPlan(result);
        setMigrationStatus('ready');
        
        toast({
          title: "Migration Plan Created",
          description: `Ready to migrate ${result.total_records} records from ${result.tables.length} tables`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setMigrationStatus('idle');
      toast({
        title: "Planning Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Execute migration
  const executeMigration = async () => {
    setMigrationStatus('running');
    setMigrationProgress(0);
    
    try {
      const response = await fetch('/api/migration/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // Simulate progress for demo - in real implementation this would use Server-Sent Events
        const progressInterval = setInterval(() => {
          setMigrationProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setMigrationStatus('completed');
              toast({
                title: "Migration Completed",
                description: "Database migration completed successfully!",
              });
              return 100;
            }
            return prev + 10;
          });
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setMigrationStatus('failed');
      toast({
        title: "Migration Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Check if user has permissions
  if (user?.role !== 'superuser') {
    return (
      <div className="p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Only superusers can access the enhanced database migration functionality.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Enhanced Database Migration</h1>
          <p className="text-medium-gray mt-1">
            Advanced MariaDB to PostgreSQL migration with interactive mapping and transformation
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="schema" disabled={connectionStatus.mariadb !== 'connected' || connectionStatus.postgresql !== 'connected'}>
            Schema Analysis
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={connectionStatus.mariadb !== 'connected' || connectionStatus.postgresql !== 'connected'}>
            Mapping
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={Object.keys(tableMappings).length === 0}>
            Preview
          </TabsTrigger>
          <TabsTrigger value="plan" disabled={Object.keys(tableMappings).length === 0}>
            Plan
          </TabsTrigger>
          <TabsTrigger value="execute" disabled={migrationStatus !== 'ready'}>
            Execute
          </TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MariaDB Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-orange-600" />
                  Legacy MariaDB Database
                  {connectionStatus.mariadb === 'connected' && (
                    <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
                  )}
                </CardTitle>
                <CardDescription>Connect to your existing MariaDB database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maria_host">Host</Label>
                    <Input
                      id="maria_host"
                      value={mariadbConfig.host}
                      onChange={(e) => setMariadbConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maria_port">Port</Label>
                    <Input
                      id="maria_port"
                      value={mariadbConfig.port}
                      onChange={(e) => setMariadbConfig(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="3306"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maria_user">Username</Label>
                    <Input
                      id="maria_user"
                      value={mariadbConfig.user}
                      onChange={(e) => setMariadbConfig(prev => ({ ...prev, user: e.target.value }))}
                      placeholder="Database username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maria_password">Password</Label>
                    <Input
                      id="maria_password"
                      type="password"
                      value={mariadbConfig.password}
                      onChange={(e) => setMariadbConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Database password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maria_database">Database Name</Label>
                  <Input
                    id="maria_database"
                    value={mariadbConfig.database}
                    onChange={(e) => setMariadbConfig(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="Source database name"
                  />
                </div>
                <Button
                  onClick={() => testConnection('mariadb')}
                  disabled={connectionStatus.mariadb === 'testing'}
                  className="w-full"
                >
                  {connectionStatus.mariadb === 'testing' ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing Connection...</>
                  ) : (
                    <><Database className="h-4 w-4 mr-2" />Test Connection</>
                  )}
                </Button>
                
                {connectionStatus.mariadb === 'connected' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connected successfully. Found {Object.keys(legacySchema).length} tables.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* PostgreSQL Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Target PostgreSQL Database
                  {connectionStatus.postgresql === 'connected' && (
                    <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
                  )}
                </CardTitle>
                <CardDescription>Connect to your PostgreSQL target database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pg_host">Host</Label>
                    <Input
                      id="pg_host"
                      value={postgresqlConfig.host}
                      onChange={(e) => setPostgresqlConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg_port">Port</Label>
                    <Input
                      id="pg_port"
                      value={postgresqlConfig.port}
                      onChange={(e) => setPostgresqlConfig(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="5432"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg_user">Username</Label>
                    <Input
                      id="pg_user"
                      value={postgresqlConfig.user}
                      onChange={(e) => setPostgresqlConfig(prev => ({ ...prev, user: e.target.value }))}
                      placeholder="Database username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg_password">Password</Label>
                    <Input
                      id="pg_password"
                      type="password"
                      value={postgresqlConfig.password}
                      onChange={(e) => setPostgresqlConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Database password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pg_database">Database Name</Label>
                  <Input
                    id="pg_database"
                    value={postgresqlConfig.database}
                    onChange={(e) => setPostgresqlConfig(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="Target database name"
                  />
                </div>
                <Button
                  onClick={() => testConnection('postgresql')}
                  disabled={connectionStatus.postgresql === 'testing'}
                  className="w-full"
                >
                  {connectionStatus.postgresql === 'testing' ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing Connection...</>
                  ) : (
                    <><Database className="h-4 w-4 mr-2" />Test Connection</>
                  )}
                </Button>
                
                {connectionStatus.postgresql === 'connected' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connected successfully. Found {Object.keys(targetSchema).length} tables.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {connectionStatus.mariadb === 'connected' && connectionStatus.postgresql === 'connected' && (
            <Card>
              <CardHeader>
                <CardTitle>Ready for Schema Analysis</CardTitle>
                <CardDescription>
                  Both databases are connected. Proceed to analyze schema structures and relationships before mapping.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('schema')} className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Continue to Schema Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Schema Analysis Tab */}
        <TabsContent value="schema" className="space-y-6">
          <MigrationSchemaAnalysis
            sourceSchema={legacySchema}
            targetSchema={targetSchema}
            connectionStatus={connectionStatus}
          />
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Button onClick={() => setActiveTab('mapping')} className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Continue to Mapping
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('connection')}>
                  Back to Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Table and Column Mapping
              </CardTitle>
              <CardDescription>
                Map legacy tables to target tables and configure column transformations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateSuggestions} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Generate AI Suggestions
              </Button>

              {suggestedMappings && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Table Mappings</h3>
                  <div className="space-y-2">
                    {Object.entries(tableMappings).map(([legacyTable, targetTables]) => (
                      <div key={legacyTable} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{legacyTable}</div>
                          <div className="text-sm text-gray-600">
                            {legacySchema[legacyTable]?.row_count || 0} rows
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <Select
                            value={targetTables[0] || ''}
                            onValueChange={(value) => {
                              setTableMappings(prev => ({
                                ...prev,
                                [legacyTable]: value ? [value] : []
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select target table" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(targetSchema).map(table => (
                                <SelectItem key={table} value={table}>{table}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewTableData(legacyTable)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setActiveTab('preview')} disabled={Object.keys(tableMappings).length === 0}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue to Preview
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('schema')}>
                  Back to Schema Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Data Preview & Editing
              </CardTitle>
              <CardDescription>
                Preview transformed data and make manual adjustments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPreviewTable && previewData[selectedPreviewTable] && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Preview: {selectedPreviewTable}</h3>
                  
                  {Object.entries(previewData[selectedPreviewTable].transformed_data).map(([targetTable, rows]) => (
                    <div key={targetTable} className="space-y-2">
                      <h4 className="font-medium">Target Table: {targetTable}</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {rows.length > 0 && Object.keys(rows[0]).map(column => (
                                <TableHead key={column}>{column}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.slice(0, 5).map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {Object.entries(row).map(([column, value]) => (
                                  <TableCell key={column} className="max-w-xs truncate">
                                    {String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={() => setActiveTab('plan')}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Plan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Tab */}
        <TabsContent value="plan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Migration Plan
              </CardTitle>
              <CardDescription>
                Review the complete migration plan before execution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={createMigrationPlan} disabled={migrationStatus === 'planning'}>
                {migrationStatus === 'planning' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Plan...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Create Migration Plan</>
                )}
              </Button>

              {migrationPlan && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Migration plan created: {migrationPlan.total_records} records from {migrationPlan.tables.length} tables. 
                      Estimated time: {Math.ceil(migrationPlan.total_estimated_time / 60)} minutes.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    {migrationPlan.tables.map((table, index) => (
                      <div key={table.legacy_table} className="flex items-center gap-4 p-3 border rounded-lg">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div className="flex-1">
                          <div className="font-medium">{table.legacy_table}</div>
                          <div className="text-sm text-gray-600">
                            {table.row_count} rows → {table.target_tables.join(', ')}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          ~{table.estimated_time_seconds}s
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => setActiveTab('execute')} className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue to Execute
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execute Tab */}
        <TabsContent value="execute" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Execute Migration
              </CardTitle>
              <CardDescription>
                Execute the migration plan and monitor progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {migrationStatus === 'ready' && (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> This will permanently modify your target database. 
                      Ensure you have a backup before proceeding.
                    </AlertDescription>
                  </Alert>
                  
                  <Button onClick={executeMigration} className="w-full" size="lg">
                    <Play className="h-4 w-4 mr-2" />
                    Execute Migration
                  </Button>
                </>
              )}

              {migrationStatus === 'running' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Migration Progress</span>
                      <span>{migrationProgress}%</span>
                    </div>
                    <Progress value={migrationProgress} className="w-full" />
                  </div>
                  
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Migration in progress... Please do not close this page.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {migrationStatus === 'completed' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Migration completed successfully! Your data has been migrated to PostgreSQL.
                  </AlertDescription>
                </Alert>
              )}

              {migrationStatus === 'failed' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Migration failed. Please check the logs and try again.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
