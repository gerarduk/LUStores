import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Database, 
  ArrowRight, 
  CheckCircle, 
  Eye,
  GitCompare,
  Route,
  Info
} from 'lucide-react';

interface SchemaInfo {
  [tableName: string]: {
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: string;
      isPrimaryKey?: boolean;
      isForeignKey?: boolean;
    }>;
    sample_data?: Record<string, unknown>[];
    row_count?: number;
    foreign_keys?: Array<{
      column: string;
      referenced_table: string;
      referenced_column: string;
    }>;
    referenced_by?: Array<{
      table: string;
      column: string;
    }>;
  };
}

interface MigrationSchemaAnalysisProps {
  sourceSchema: SchemaInfo;
  targetSchema: SchemaInfo;
  connectionStatus: {
    mariadb: 'idle' | 'testing' | 'connected' | 'failed';
    postgresql: 'idle' | 'testing' | 'connected' | 'failed';
  };
  onTableSelect?: (table: string, type: 'source' | 'target') => void;
}

// Target schema migration order (from our previous analysis)
const TARGET_MIGRATION_ORDER = [
  'users', 'notes', 'categories', 'suppliers', 'chargecodes', 'items', 
  'orders', 'quotes', 'sales', 'order_items', 'quote_items', 'sale_items', 
  'stock_movements', 'sources', 'charge_code_exclusions', 'user_permissions'
];

const MigrationSchemaAnalysis: React.FC<MigrationSchemaAnalysisProps> = ({
  sourceSchema,
  targetSchema,
  connectionStatus,
  onTableSelect
}) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'source' | 'target'>('source');
  const [analysisMode, setAnalysisMode] = useState<'overview' | 'comparison' | 'migration-order'>('overview');

  // Calculate schema statistics
  const sourceStats = {
    tables: Object.keys(sourceSchema).length,
    totalColumns: Object.values(sourceSchema).reduce((sum, table) => sum + table.columns.length, 0),
    totalRows: Object.values(sourceSchema).reduce((sum, table) => sum + (table.row_count || 0), 0),
    withForeignKeys: Object.values(sourceSchema).filter(table => (table.foreign_keys?.length || 0) > 0).length
  };

  const targetStats = {
    tables: Object.keys(targetSchema).length,
    totalColumns: Object.values(targetSchema).reduce((sum, table) => sum + table.columns.length, 0),
    totalRows: Object.values(targetSchema).reduce((sum, table) => sum + (table.row_count || 0), 0),
    withForeignKeys: Object.values(targetSchema).filter(table => (table.foreign_keys?.length || 0) > 0).length
  };

  // Find potential mapping candidates
  const findMappingCandidates = (sourceTableName: string) => {
    const candidates = Object.keys(targetSchema).filter(targetTable => {
      // Simple name matching
      if (targetTable.toLowerCase().includes(sourceTableName.toLowerCase()) ||
          sourceTableName.toLowerCase().includes(targetTable.toLowerCase())) {
        return true;
      }
      
      // Check column similarity
      const sourceColumns = sourceSchema[sourceTableName]?.columns.map(c => c.name.toLowerCase()) || [];
      const targetColumns = targetSchema[targetTable]?.columns.map(c => c.name.toLowerCase()) || [];
      const commonColumns = sourceColumns.filter(col => targetColumns.includes(col));
      
      return commonColumns.length >= Math.min(sourceColumns.length, targetColumns.length) * 0.3; // 30% overlap
    });
    
    return candidates;
  };

  // Render table card
  const renderTableCard = (tableName: string, schema: SchemaInfo, type: 'source' | 'target') => {
    const table = schema[tableName];
    if (!table) return null;

    const candidates = type === 'source' ? findMappingCandidates(tableName) : [];

    return (
      <Card 
        key={tableName} 
        className={`cursor-pointer transition-all hover:shadow-md ${
          selectedTable === tableName && selectedType === type 
            ? 'border-blue-500 shadow-md' 
            : 'hover:border-gray-300'
        }`}
        onClick={() => {
          setSelectedTable(tableName);
          setSelectedType(type);
          onTableSelect?.(tableName, type);
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="font-mono">{tableName}</span>
            <div className="flex items-center space-x-2">
              {type === 'source' && candidates.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {candidates.length} match{candidates.length !== 1 ? 'es' : ''}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {table.columns.length} cols
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rows:</span>
              <span className="font-semibold">{(table.row_count || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Foreign Keys:</span>
              <span className="font-semibold">{table.foreign_keys?.length || 0}</span>
            </div>
            {type === 'source' && candidates.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {candidates.slice(0, 2).map(candidate => (
                  <Badge key={candidate} variant="outline" className="text-xs text-green-600">
                    → {candidate}
                  </Badge>
                ))}
                {candidates.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{candidates.length - 2} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render detailed table view
  const renderTableDetails = () => {
    if (!selectedTable) return null;
    
    const schema = selectedType === 'source' ? sourceSchema : targetSchema;
    const table = schema[selectedTable];
    if (!table) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className={selectedType === 'source' ? 'text-orange-600' : 'text-blue-600'} />
            <span>{selectedType === 'source' ? 'Source' : 'Target'}: {selectedTable}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="columns">
            <TabsList>
              <TabsTrigger value="columns">Columns ({table.columns.length})</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              {table.sample_data && <TabsTrigger value="sample">Sample Data</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="columns" className="mt-4">
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Keys</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.columns.map((column, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono font-semibold">{column.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{column.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {column.nullable ? (
                            <Badge variant="secondary" className="text-xs">NULL</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">NOT NULL</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {column.defaultValue || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {column.isPrimaryKey && (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800">PK</Badge>
                            )}
                            {column.isForeignKey && (
                              <Badge className="text-xs bg-blue-100 text-blue-800">FK</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="relationships" className="mt-4">
              <div className="space-y-4">
                {table.foreign_keys && table.foreign_keys.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Foreign Keys</h4>
                    <div className="space-y-2">
                      {table.foreign_keys.map((fk, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                          <Badge className="text-xs">{fk.column}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-sm">{fk.referenced_table}.{fk.referenced_column}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {table.referenced_by && table.referenced_by.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Referenced By</h4>
                    <div className="space-y-2">
                      {table.referenced_by.map((ref, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                          <span className="text-sm">{ref.table}.{ref.column}</span>
                          <ArrowRight className="h-3 w-3 rotate-180" />
                          <Badge className="text-xs">references this table</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!table.foreign_keys?.length && !table.referenced_by?.length) && (
                  <div className="text-center py-4 text-gray-500">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No foreign key relationships</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {table.sample_data && (
              <TabsContent value="sample" className="mt-4">
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {table.sample_data[0] && Object.keys(table.sample_data[0]).map(col => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.sample_data.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, colIndex) => (
                            <TableCell key={colIndex} className="max-w-32 truncate">
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // Render migration order analysis
  const renderMigrationOrder = () => (
    <div className="space-y-4">
      <Alert>
        <Route className="h-4 w-4" />
        <AlertDescription>
          <strong>Migration Order Analysis:</strong> Tables must be migrated in dependency order to maintain referential integrity.
        </AlertDescription>
      </Alert>
      
      <div className="grid gap-3">
        {TARGET_MIGRATION_ORDER.map((tableName, index) => {
          const targetTable = targetSchema[tableName];
          const hasData = targetTable && (targetTable.row_count || 0) > 0;
          const fkCount = targetTable?.foreign_keys?.length || 0;
          
          return (
            <div key={tableName} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Badge variant="outline" className="min-w-8 h-8 flex items-center justify-center">
                {index + 1}
              </Badge>
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-semibold">{tableName}</span>
                  {index === 0 && (
                    <Badge className="text-xs bg-green-100 text-green-800">Independent</Badge>
                  )}
                  {fkCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {fkCount} FK{fkCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {targetTable && (
                  <div className="text-sm text-gray-500">
                    {targetTable.columns.length} columns • {(targetTable.row_count || 0).toLocaleString()} rows
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {hasData ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                )}
                {targetTable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTable(tableName);
                      setSelectedType('target');
                      setAnalysisMode('overview');
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Legend:</strong> Green checkmarks indicate tables with existing data. 
          Tables should be migrated in the order shown to respect foreign key constraints.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-orange-600" />
                <span className="font-semibold">Source (MariaDB)</span>
              </div>
              <Badge 
                className={connectionStatus.mariadb === 'connected' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
                }
              >
                {connectionStatus.mariadb}
              </Badge>
            </div>
            {connectionStatus.mariadb === 'connected' && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tables:</span>
                  <span className="font-semibold ml-2">{sourceStats.tables}</span>
                </div>
                <div>
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-semibold ml-2">{sourceStats.totalColumns}</span>
                </div>
                <div>
                  <span className="text-gray-600">Records:</span>
                  <span className="font-semibold ml-2">{sourceStats.totalRows.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">With FKs:</span>
                  <span className="font-semibold ml-2">{sourceStats.withForeignKeys}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Target (PostgreSQL)</span>
              </div>
              <Badge 
                className={connectionStatus.postgresql === 'connected' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
                }
              >
                {connectionStatus.postgresql}
              </Badge>
            </div>
            {connectionStatus.postgresql === 'connected' && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tables:</span>
                  <span className="font-semibold ml-2">{targetStats.tables}</span>
                </div>
                <div>
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-semibold ml-2">{targetStats.totalColumns}</span>
                </div>
                <div>
                  <span className="text-gray-600">Records:</span>
                  <span className="font-semibold ml-2">{targetStats.totalRows.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">With FKs:</span>
                  <span className="font-semibold ml-2">{targetStats.withForeignKeys}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as 'overview' | 'comparison' | 'migration-order')}>
        <TabsList>
          <TabsTrigger value="overview">Schema Overview</TabsTrigger>
          <TabsTrigger value="comparison">Table Comparison</TabsTrigger>
          <TabsTrigger value="migration-order">Migration Order</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Tables */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600 flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Source Tables ({Object.keys(sourceSchema).length})</span>
              </h3>
              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {Object.keys(sourceSchema).map(tableName => 
                    renderTableCard(tableName, sourceSchema, 'source')
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Target Tables */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-600 flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Target Tables ({Object.keys(targetSchema).length})</span>
              </h3>
              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {Object.keys(targetSchema).map(tableName => 
                    renderTableCard(tableName, targetSchema, 'target')
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Selected table details */}
          {selectedTable && (
            <div className="mt-6">
              {renderTableDetails()}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="comparison" className="space-y-4">
          <Alert>
            <GitCompare className="h-4 w-4" />
            <AlertDescription>
              Select tables from source and target to compare their structures and identify potential mappings.
            </AlertDescription>
          </Alert>
          {/* Table comparison content would go here */}
        </TabsContent>
        
        <TabsContent value="migration-order" className="space-y-4">
          {renderMigrationOrder()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MigrationSchemaAnalysis;