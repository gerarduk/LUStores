import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface TestResult {
  id: string;
  type: string;
  status: 'running' | 'completed' | 'failed';
  output: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface DeploymentStatus {
  environment: string;
  status: 'healthy' | 'deploying' | 'error';
  lastDeployment: string;
  version: string;
  health: {
    database: boolean;
    api: boolean;
    frontend: boolean;
  };
}

interface SystemStatus {
  cpu: number;
  memory: number;
  disk: number;
  database: {
    healthy: boolean;
    connections: number;
  };
  sessions: number;
  peakSessions: number;
  uptime: number;
}

export default function SystemManagement() {
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch system status
  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ["/api/system/status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch test results
  const { data: testResults } = useQuery<TestResult[]>({
    queryKey: ["/api/system/tests"],
    refetchInterval: 2000, // Refresh every 2 seconds when tests are running
  });

  // Fetch deployment status
  const { data: deploymentStatus } = useQuery<DeploymentStatus[]>({
    queryKey: ["/api/system/deployment"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Test runner mutation
  const runTestMutation = useMutation({
    mutationFn: async (testType: string) => {
      return apiRequest("POST", "/api/system/run-tests", { testType });
    },
    onSuccess: (data, testType) => {
      setActiveTest(testType);
      queryClient.invalidateQueries({ queryKey: ["/api/system/tests"] });
    },
  });

  const handleRunTest = (testType: string) => {
    runTestMutation.mutate(testType);
  };

  const testSuites = [
    {
      id: 'unit',
      name: 'Unit Tests',
      description: 'Fast unit tests for core functionality',
      command: 'npm test',
      icon: 'fas fa-vial',
      color: 'blue',
    },
    {
      id: 'integration',
      name: 'Integration Tests',
      description: 'API and database integration tests',
      command: 'npm run test:integration',
      icon: 'fas fa-plug',
      color: 'green',
    },
    {
      id: 'coverage',
      name: 'Coverage Report',
      description: 'Generate code coverage report',
      command: 'npm run test:coverage',
      icon: 'fas fa-chart-pie',
      color: 'purple',
    },
    {
      id: 'sales',
      name: 'Sales Tests',
      description: 'Sales module specific tests',
      command: 'npm run test:sales',
      icon: 'fas fa-shopping-cart',
      color: 'orange',
    },
    {
      id: 'system',
      name: 'System Management Tests',
      description: 'System management and monitoring tests',
      command: 'npm run test:system',
      icon: 'fas fa-server',
      color: 'teal',
    },
    {
      id: 'ci',
      name: 'CI Test Suite',
      description: 'Continuous integration (CI) test suite',
      command: 'npm run test:ci',
      icon: 'fas fa-cogs',
      color: 'gray',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (healthy: boolean) => {
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  const repositoryUrl = 'https://github.com/st7ma784/LUStores';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">System Management</h1>
          <p className="text-medium-gray">Test runner, deployment monitoring, and repository dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.open(`${repositoryUrl}/actions`, '_blank')}
          >
            <i className="fab fa-github mr-2"></i>
            CI/CD Pipeline
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.open(repositoryUrl, '_blank')}
          >
            <i className="fas fa-external-link-alt mr-2"></i>
            Repository
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests">Test Runner</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="monitoring">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          {/* Test Suites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testSuites.map((suite) => {
              const isRunning = activeTest === suite.id || 
                Boolean(testResults?.find((t: TestResult) => t.type === suite.id && t.status === 'running'));
              const lastResult = testResults?.find((t: TestResult) => t.type === suite.id);

              return (
                <Card key={suite.id} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center">
                        <i className={`${suite.icon} mr-2 text-${suite.color}-600`}></i>
                        {suite.name}
                      </div>
                      {lastResult && (
                        <Badge className={getStatusColor(lastResult.status)}>
                          {lastResult.status}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-medium-gray mb-4">{suite.description}</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleRunTest(suite.id)}
                        disabled={isRunning || runTestMutation.isPending}
                        className="w-full"
                        size="sm"
                      >
                        {isRunning ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Running...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-play mr-2"></i>
                            Run Tests
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-medium-gray">
                        <code>{suite.command}</code>
                      </div>
                      {lastResult?.duration && (
                        <div className="text-xs text-medium-gray">
                          Last run: {lastResult.duration}ms
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Test Results */}
          {testResults && testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-list-alt mr-2"></i>
                  Recent Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults
                    .filter((result: TestResult) => ['unit', 'integration', 'coverage', 'sales', 'system', 'ci'].includes(result.type))
                    .sort((a: TestResult, b: TestResult) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                    .slice(0, 6)
                    .map((result: TestResult) => (
                      <div key={result.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                            <span className="ml-2 font-medium">{result.type}</span>
                          </div>
                          <span className="text-sm text-medium-gray">
                            {new Date(result.startTime).toLocaleString()}
                          </span>
                        </div>
                        {result.output && (
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-32">
                            {result.output}
                          </pre>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deployment" className="space-y-6">
          {/* Repository Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fab fa-github mr-2"></i>
                Repository Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.open(repositoryUrl, '_blank')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <i className="fas fa-code-branch text-2xl mb-2"></i>
                  <span>Repository</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`${repositoryUrl}/actions`, '_blank')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <i className="fas fa-cogs text-2xl mb-2"></i>
                  <span>CI/CD Actions</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`${repositoryUrl}/issues`, '_blank')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <i className="fas fa-bug text-2xl mb-2"></i>
                  <span>Issues</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`${repositoryUrl}/pulse`, '_blank')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <i className="fas fa-chart-line text-2xl mb-2"></i>
                  <span>Insights</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Deployment Status */}
          {deploymentStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-server mr-2"></i>
                  Deployment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {deploymentStatus.map((env: DeploymentStatus) => (
                    <div key={env.environment} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium capitalize">{env.environment}</h3>
                        <Badge className={
                          env.status === 'healthy' ? 'bg-green-100 text-green-800' :
                          env.status === 'deploying' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {env.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>Version: <code>{env.version}</code></div>
                        <div>Last Deploy: {new Date(env.lastDeployment).toLocaleString()}</div>
                        <div className="flex items-center space-x-4">
                          <span className={getHealthColor(env.health.database)}>
                            <i className="fas fa-database mr-1"></i>
                            Database
                          </span>
                          <span className={getHealthColor(env.health.api)}>
                            <i className="fas fa-server mr-1"></i>
                            API
                          </span>
                          <span className={getHealthColor(env.health.frontend)}>
                            <i className="fas fa-desktop mr-1"></i>
                            Frontend
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          {/* System Health */}
          {systemStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <i className="fas fa-heartbeat mr-2 text-red-500"></i>
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>CPU Usage</span>
                      <span>{systemStatus.cpu}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage</span>
                      <span>{systemStatus.memory}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Disk Usage</span>
                      <span>{systemStatus.disk}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <i className="fas fa-database mr-2 text-blue-500"></i>
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Connection Pool</span>
                      <span className={getHealthColor(systemStatus.database.healthy)}>
                        {systemStatus.database.healthy ? 'Healthy' : 'Error'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Connections</span>
                      <span>{systemStatus.database.connections}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <i className="fas fa-users mr-2 text-green-500"></i>
                    Active Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Current Sessions</span>
                      <span>{systemStatus.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak Today</span>
                      <span>{systemStatus.peakSessions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!systemStatus && (
            <Alert>
              <AlertDescription>
                System monitoring data is not available. Check if the monitoring service is running.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
