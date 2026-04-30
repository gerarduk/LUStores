import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings as SettingsIcon, Shield, Users, AlertTriangle } from 'lucide-react';
import { ThemeSettings } from "@/components/ThemeSettings";
import EnhancedDatabaseMigration from '@/components/EnhancedDatabaseMigration';
import DatabaseSchemaManager from '@/components/DatabaseSchemaManager';
import LabelPrinting from '@/components/LabelPrinting';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'superuser' | 'admin';
}

interface Setting {
  id: string;
  key: string;
  value: string | boolean | number;
  description?: string;
  type: 'text' | 'boolean' | 'number';
  isSystem?: boolean;
}

interface SystemSettings {
  inventory?: Setting[];
  orders?: Setting[];
  notifications?: Setting[];
  security?: Setting[];
  permissions?: Setting[];
}

interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isSystem?: boolean;
  granted?: boolean;
}

interface UserWithPermissions extends User {
  permissions?: Permission[];
}

interface VATRate {
  value: string;
  label: string;
}

// Helper function to convert setting keys to user-friendly labels
const getSettingLabel = (key: string): string => {
  const labels: Record<string, string> = {
    'notifications.show_low_stock': 'Low Stock Notifications',
    'notifications.email_enabled': 'Email Notifications',
    'permissions.enforce': 'Enforce Permissions',
    'auth.require_password_change': 'Require Password Change',
    'auth.session_timeout': 'Session Timeout (seconds)',
    'permissions.quote_to_sale_roles': 'Quote to Sale Roles',
    'permissions.add_vendor_roles': 'Add Vendor Roles',
    'permissions.create_order_roles': 'Create Order Roles',
    'permissions.view_categories_roles': 'View Categories Roles',
    'permissions.manage_categories_roles': 'Manage Categories Roles',
    'permissions.generate_reports_roles': 'Generate Reports Roles',
    'permissions.database_backup_roles': 'Database Backup Roles',
    'security.password_min_length': 'Minimum Password Length',
    'security.session_secure': 'Secure Session Cookies',
    'security.login_attempts_max': 'Max Failed Login Attempts',
  };
  return labels[key] || key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || key;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [vatRates, setVatRates] = useState<VATRate[]>([]);
  const [newVatRate, setNewVatRate] = useState({ value: '', label: '' });
  
  // Migration state - REMOVED: Migration functionality has been removed
  
  const [permissionSearch, setPermissionSearch] = useState<string>('');
  const [pageVisibilityConfig, setPageVisibilityConfig] = useState<Record<string, string[]>>({});

  // Fetch permission definitions
  const { data: permissionDefinitions } = useQuery({
    queryKey: ['/api/settings/permissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings/permissions');
      return response.json();
    },
  });

  // Fetch system settings
  const { data: systemSettings, isLoading: loadingSettings, error: settingsError } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/settings');
        const data = await response.json();
        console.log('Settings loaded:', data);
        return data;
      } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
      }
    },
  });

  // Log any errors
  useEffect(() => {
    if (settingsError) {
      console.error('Settings query error:', settingsError);
    }
  }, [settingsError]);

  // Fetch users with permissions
  const { data: usersWithPermissions, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/settings/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings/users');
      return response.json();
    },
  });

  // Fetch VAT rates
  const { data: vatRatesData, isLoading: loadingVatRates } = useQuery({
    queryKey: ['/api/settings/vat-rates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings/vat-rates');
      return response.json();
    },
  });

  // Update VAT rates when data is loaded
  useEffect(() => {
    if (vatRatesData?.vatRates) {
      setVatRates(vatRatesData.vatRates);
    }
  }, [vatRatesData]);

  // Load page visibility settings (per-role)
  const { data: pageVisibilityData, refetch: refetchPageVisibility } = useQuery({
    queryKey: ['/api/settings/page-visibility'],
    queryFn: async () => {
      const results: Record<string, string[]> = {};
      for (const role of ['user', 'superuser', 'admin']) {
        try {
          const response = await apiRequest('GET', `/api/settings/pages.visible_to_${role}`);
          const data = await response.json();
          if (data.value !== null && Array.isArray(data.value)) {
            results[role] = data.value;
          }
        } catch {
          // Key doesn't exist yet; leave unset (all pages visible by default for role)
        }
      }
      return results;
    },
  });

  useEffect(() => {
    if (pageVisibilityData) setPageVisibilityConfig(pageVisibilityData);
  }, [pageVisibilityData]);

  // Update system setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | boolean | number }) => {
      const response = await apiRequest('PUT', `/api/settings/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "System setting has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  // Update user permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, permission, granted }: { userId: string; permission: string; granted: boolean }) => {
      const response = await apiRequest('PUT', `/api/settings/users/${userId}/permissions/${permission}`, { granted });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permission Updated",
        description: "User permission has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  // Update VAT rates mutation
  const updateVatRatesMutation = useMutation({
    mutationFn: async (rates: VATRate[]) => {
      const response = await apiRequest('PUT', '/api/settings/vat-rates', { vatRates: rates });
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "VAT Rates Updated",
        description: "VAT rates have been updated successfully."
      });
      // Refetch VAT rates and update local state to ensure UI is fresh
      const response = await apiRequest('GET', '/api/settings/vat-rates');
      const data = await response.json();
      if (data?.vatRates) setVatRates(data.vatRates);
      queryClient.invalidateQueries({ queryKey: ['/api/settings/vat-rates'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update VAT rates",
        variant: "destructive",
      });
    },
  });

  // Fetch deployment notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/deployments'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/notifications/deployments');
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.warn('Failed to fetch notifications:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch low stock items count
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['/api/dashboard/low-stock'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Clear all deployment notifications mutation
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/notifications/deployments');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notifications Cleared",
        description: `Cleared ${data.count || 0} deployment notification(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/deployments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear notifications",
        variant: "destructive",
      });
    },
  });

  // Clear all low stock notifications mutation
  const clearLowStockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/notifications/low-stock');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Low Stock Alerts Acknowledged",
        description: `Acknowledged ${data.count || 0} low stock alert(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/low-stock'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to acknowledge low stock alerts",
        variant: "destructive",
      });
    },
  });

  // Clear both types of notifications
  const clearAllTypesMutation = useMutation({
    mutationFn: async () => {
      const [deploymentsResponse, lowStockResponse] = await Promise.all([
        apiRequest('DELETE', '/api/notifications/deployments'),
        apiRequest('DELETE', '/api/notifications/low-stock')
      ]);
      const deploymentsData = await deploymentsResponse.json();
      const lowStockData = await lowStockResponse.json();
      return {
        deployments: deploymentsData.count || 0,
        lowStock: lowStockData.count || 0
      };
    },
    onSuccess: (data) => {
      toast({
        title: "All Notifications Cleared",
        description: `Cleared ${data.deployments} deployment and ${data.lowStock} low stock notifications`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/deployments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/low-stock'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear all notifications",
        variant: "destructive",
      });
    },
  });

  // Check if user has settings permissions
  const canViewSettings = (user as User)?.role === 'admin';
  const canEditSettings = (user as User)?.role === 'admin';
  const canManagePermissions = (user as User)?.role === 'admin';

  if (!canViewSettings) {
    return (
      <div className="p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view system settings. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSettingChange = (key: string, value: string | boolean | number) => {
    if (!canEditSettings) return;
    
    // Update cache optimistically
    queryClient.setQueryData(['/api/settings'], (oldData: SystemSettings | undefined) => {
      if (!oldData) return oldData;
      const updated = { ...oldData };
      
      // Find which category this setting belongs to
      for (const category of Object.keys(updated) as Array<keyof SystemSettings>) {
        if (Array.isArray(updated[category])) {
          const settingIndex = (updated[category] as Setting[]).findIndex(s => s.key === key);
          if (settingIndex !== -1) {
            updated[category] = [...(updated[category] as Setting[])];
            (updated[category] as Setting[])[settingIndex] = {
              ...(updated[category] as Setting[])[settingIndex],
              value
            };
            break;
          }
        }
      }
      
      return updated;
    });
    
    // Then sync with server
    updateSettingMutation.mutate({ key, value });
  };

  const handlePermissionToggle = (userId: string, permission: string, granted: boolean) => {
    if (!canManagePermissions) return;
    
    // Update cache optimistically
    queryClient.setQueryData(['/api/settings/users'], (oldData: UserWithPermissions[] | undefined) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;
      
      return oldData.map((user: UserWithPermissions) => {
        if (user.id === userId) {
          const userPermissions = user.permissions || [];
          if (granted) {
            // Add permission if not already there
            const hasPermission = userPermissions.some((p: Permission) => p && p.name === permission);
            if (!hasPermission) {
              return {
                ...user,
                permissions: [...userPermissions, { name: permission }]
              };
            }
          } else {
            // Remove permission
            return {
              ...user,
              permissions: userPermissions.filter((p: Permission) => p && p.name !== permission)
            };
          }
        }
        return user;
      });
    });
    
    // Then sync with server
    updatePermissionMutation.mutate({ userId, permission, granted });
  };

  const handleAddVatRate = () => {
    if (!newVatRate.value || !newVatRate.label) {
      toast({
        title: "Validation Error",
        description: "Both value and label are required",
        variant: "destructive",
      });
      return;
    }

    const numValue = parseFloat(newVatRate.value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
      toast({
        title: "Validation Error",
        description: "VAT rate must be between 0 and 1 (e.g., 0.20 for 20%)",
        variant: "destructive",
      });
      return;
    }

    const formattedValue = numValue.toFixed(4);
    const updatedRates = [...vatRates, { value: formattedValue, label: newVatRate.label }];
    setVatRates(updatedRates);
    setNewVatRate({ value: '', label: '' });
    updateVatRatesMutation.mutate(updatedRates);
  };

  const handleRemoveVatRate = (index: number) => {
    const updatedRates = vatRates.filter((_, i) => i !== index);
    setVatRates(updatedRates);
    updateVatRatesMutation.mutate(updatedRates);
  };

  const handleUpdateVatRate = (index: number, field: 'value' | 'label', newValue: string) => {
    const updatedRates = [...vatRates];
    updatedRates[index] = { ...updatedRates[index], [field]: newValue };
    setVatRates(updatedRates);
  };

  const handleSaveVatRates = () => {
    updateVatRatesMutation.mutate(vatRates);
  };

  // Migration handlers

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300";
      case "superuser": return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300";
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">System Settings</h1>
          <p className="text-medium-gray mt-1">Manage system configuration and user permissions</p>
        </div>
        <SettingsIcon className="h-8 w-8 text-medium-gray" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="vat">VAT Rates</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="pages" disabled={!canManagePermissions}>Pages</TabsTrigger>
          <TabsTrigger value="permissions" disabled={!canManagePermissions}>Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="schema">Database Schema</TabsTrigger>
          <TabsTrigger value="migration" disabled={user?.role !== 'superuser'}>Migration</TabsTrigger>
          <TabsTrigger value="labels">Label Printing</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <ThemeSettings />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          {/* User Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>Personal settings for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex-1">
                  <Label htmlFor="show-picking-list" className="text-sm font-medium cursor-pointer">Show Picking List After Sales</Label>
                  <p className="text-sm text-muted-foreground">
                    Display item locations and picking list after completing sales.
                    Disable this if you don't need location information.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-picking-list"
                    checked={user?.showPickingList !== false}
                    onCheckedChange={async (checked) => {
                      try {
                        const response = await fetch(
                          `/api/users/${user?.id}/preferences/picking-list`,
                          {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ showPickingList: checked })
                          }
                        );

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || 'Failed to update preference');
                        }

                        // Refresh user data immediately and wait for it
                        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                        // Ensure the query is refetched
                        await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });

                        toast({
                          title: 'Preference Updated',
                          description: `Picking list will ${checked ? 'now' : 'no longer'} be shown after completing sales.`
                        });
                      } catch (error) {
                        console.error('Error updating preference:', error);
                        toast({
                          title: 'Error',
                          description: error instanceof Error ? error.message : 'Failed to update preference. Please try again.',
                          variant: 'destructive'
                        });
                      }
                    }}
                    showStatusIndicator={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic system configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !systemSettings || (!systemSettings.inventory && !systemSettings.orders && !systemSettings.notifications && !systemSettings.security) ? (
                <div className="flex items-center justify-center py-8">
                  <Alert className="w-full">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No settings available. System Settings: {JSON.stringify(systemSettings)}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <>
                  {(systemSettings as SystemSettings)?.inventory?.map((setting: Setting) => (
                    <div key={setting.key} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <Label htmlFor={`setting-${setting.key}`} className="text-sm font-medium cursor-pointer">{getSettingLabel(setting.key)}</Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {typeof setting.value === 'boolean' ? (
                          <Switch
                            id={`setting-${setting.key}`}
                            checked={setting.value}
                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                            disabled={!canEditSettings || setting.isSystem}
                            showStatusIndicator={true}
                          />
                        ) : (
                          <Input
                            id={`setting-${setting.key}`}
                            value={setting.value?.toString() || ''}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            disabled={!canEditSettings || setting.isSystem}
                            className="w-32"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {(systemSettings as SystemSettings)?.orders?.map((setting: Setting) => (
                    <div key={setting.key} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <Label htmlFor={`setting-${setting.key}`} className="text-sm font-medium cursor-pointer">{getSettingLabel(setting.key)}</Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {typeof setting.value === 'boolean' ? (
                          <Switch
                            id={`setting-${setting.key}`}
                            checked={setting.value}
                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                            disabled={!canEditSettings || setting.isSystem}
                            showStatusIndicator={true}
                          />
                        ) : (
                          <Input
                            id={`setting-${setting.key}`}
                            value={setting.value?.toString() || ''}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            disabled={!canEditSettings || setting.isSystem}
                            className="w-32"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {(systemSettings as SystemSettings)?.notifications?.filter((s: Setting) => s.key !== 'notifications.email_enabled').map((setting: Setting) => (
                    <div key={setting.key} className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <Label htmlFor={`setting-${setting.key}`} className="text-sm font-medium cursor-pointer">{getSettingLabel(setting.key)}</Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {setting.value === true || setting.value === false || setting.value === 'true' || setting.value === 'false' ? (
                          <Switch
                            id={`setting-${setting.key}`}
                            checked={setting.value === true || setting.value === 'true'}
                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                            disabled={!canEditSettings || setting.isSystem}
                            showStatusIndicator={true}
                          />
                        ) : (
                          <Input
                            id={`setting-${setting.key}`}
                            value={setting.value?.toString() || ''}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            disabled={!canEditSettings || setting.isSystem}
                            className="w-32"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {(systemSettings as SystemSettings)?.security?.map((setting: Setting) => (
                    <div key={setting.key} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <Label htmlFor={`setting-${setting.key}`} className="text-sm font-medium cursor-pointer">{getSettingLabel(setting.key)}</Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {setting.value === true || setting.value === false || setting.value === 'true' || setting.value === 'false' ? (
                          <Switch
                            id={`setting-${setting.key}`}
                            checked={setting.value === true || setting.value === 'true'}
                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                            disabled={!canEditSettings || setting.isSystem}
                          />
                        ) : (
                          <Input
                            id={`setting-${setting.key}`}
                            value={setting.value?.toString() || ''}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            disabled={!canEditSettings || setting.isSystem}
                            className="w-32"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>VAT Rate Configuration</CardTitle>
              <CardDescription>
                Configure standard VAT rates for items and sales. These rates will be available when creating or editing inventory items and processing sales.
                Historic sales and orders will not be affected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingVatRates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Existing VAT Rates */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Current VAT Rates</h3>
                    {vatRates.length === 0 ? (
                      <p className="text-sm text-medium-gray">No VAT rates configured yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {vatRates.map((rate, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-medium-gray">Value</Label>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  max="1"
                                  value={rate.value}
                                  onChange={(e) => handleUpdateVatRate(index, 'value', e.target.value)}
                                  disabled={!canEditSettings}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-medium-gray">Label</Label>
                                <Input
                                  value={rate.label}
                                  onChange={(e) => handleUpdateVatRate(index, 'label', e.target.value)}
                                  disabled={!canEditSettings}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {(parseFloat(rate.value) * 100).toFixed(2)}%
                              </Badge>
                              {canEditSettings && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveVatRate(index)}
                                  className="h-8 text-xs"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {vatRates.length > 0 && canEditSettings && (
                      <Button
                        onClick={handleSaveVatRates}
                        disabled={updateVatRatesMutation.isPending}
                        className="mt-2"
                      >
                        {updateVatRatesMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Add New VAT Rate */}
                  {canEditSettings && (
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="text-sm font-medium">Add New VAT Rate</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Value (0-1)</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            max="1"
                            placeholder="e.g., 0.20 for 20%"
                            value={newVatRate.value}
                            onChange={(e) => setNewVatRate({ ...newVatRate, value: e.target.value })}
                          />
                          <p className="text-xs text-medium-gray mt-1">
                            Enter as decimal (e.g., 0.20 = 20%)
                          </p>
                        </div>
                        <div>
                          <Label>Label</Label>
                          <Input
                            placeholder="e.g., 20% (Standard Rate)"
                            value={newVatRate.label}
                            onChange={(e) => setNewVatRate({ ...newVatRate, label: e.target.value })}
                          />
                          <p className="text-xs text-medium-gray mt-1">
                            Descriptive name for this rate
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleAddVatRate}>
                        Add VAT Rate
                      </Button>
                    </div>
                  )}

                  {!canEditSettings && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You don't have permission to edit VAT rates. Contact an administrator for access.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Authentication and security configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                (systemSettings as SystemSettings)?.security?.map((setting: Setting) => (
                  <div key={setting.key} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <Label htmlFor={`security-${setting.key}`} className="text-sm font-medium cursor-pointer">{setting.key}</Label>
                      <p className="text-sm text-medium-gray">{setting.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {typeof setting.value === 'boolean' ? (
                        <Switch
                          id={`security-${setting.key}`}
                          checked={setting.value}
                          onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                          disabled={!canEditSettings || setting.isSystem}
                          showStatusIndicator={true}
                        />
                      ) : (
                        <Input
                          id={`security-${setting.key}`}
                          value={setting.value?.toString() || ''}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                          disabled={!canEditSettings || setting.isSystem}
                          className="w-32"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          {!canManagePermissions ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <p className="text-medium-gray">You don't have permission to manage page visibility settings.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Page visibility is role-based. Changes apply to all users with that role, including future ones.
                  If no pages are configured for a role, all pages accessible to that role are shown by default.
                </AlertDescription>
              </Alert>
              {['user', 'superuser', 'admin'].map((role) => {
                const ALL_PAGES = ['dashboard', 'inventory', 'sales', 'orders', 'notes', 'categories', 'vendors', 'users', 'reports', 'analytics', 'chargecodes', 'backups', 'system', 'settings', 'documentation'];
                // If no config stored for this role, all pages are visible
                const configuredPages: string[] | undefined = pageVisibilityConfig[role];
                const allowedPages = configuredPages ?? ALL_PAGES;

                return (
                  <Card key={role}>
                    <CardHeader>
                      <CardTitle className="capitalize">{role} - Visible Pages</CardTitle>
                      <CardDescription>
                        Select which pages users with the <strong>{role}</strong> role can see in the sidebar.
                        {!configuredPages && <span className="text-muted-foreground"> (Using defaults — all pages visible)</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {ALL_PAGES.map((page) => {
                          const isChecked = allowedPages.includes(page);
                          return (
                            <div key={`${role}-${page}`} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`page-${role}-${page}`}
                                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                checked={isChecked}
                                onChange={async (e) => {
                                  try {
                                    const newPages = e.target.checked
                                      ? [...allowedPages, page]
                                      : allowedPages.filter((p) => p !== page);

                                    // Persist to settings
                                    await apiRequest('PUT', `/api/settings/pages.visible_to_${role}`, { value: newPages });

                                    // Update local state immediately
                                    setPageVisibilityConfig((prev) => ({ ...prev, [role]: newPages }));
                                    refetchPageVisibility();
                                    // Invalidate sidebar query in other components
                                    queryClient.invalidateQueries({ queryKey: ['/api/settings/page-visibility'] });

                                    toast({
                                      title: 'Success',
                                      description: `${role} ${e.target.checked ? 'granted' : 'denied'} access to ${page}`
                                    });
                                  } catch {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to update page access',
                                      variant: 'destructive'
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`page-${role}-${page}`} className="capitalize cursor-pointer">
                                {page}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {!canManagePermissions ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">Access Restricted</h3>
                    <p className="text-muted-foreground">
                      You don't have permission to manage user permissions. Contact your administrator for access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Select a user to manage their permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(usersWithPermissions as UserWithPermissions[])?.map((userItem: UserWithPermissions) => (
                      <div
                        key={userItem.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedUser === userItem.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                        onClick={() => setSelectedUser(userItem.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{userItem.firstName} {userItem.lastName}</p>
                            <p className="text-sm text-medium-gray">{userItem.email}</p>
                          </div>
                          <Badge className={getRoleBadgeColor(userItem.role)}>{userItem.role}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permission Management */}
            <Card>
              <CardHeader>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  {selectedUser ? 'Manage permissions for selected user' : 'Select a user to manage permissions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedUser && permissionDefinitions && Array.isArray(permissionDefinitions) ? (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <Input
                        placeholder="Search permissions..."
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    {(permissionDefinitions as Permission[])?.filter((permission: Permission) => 
                      permission && permission.name && (
                        permission.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                        permission.description?.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                        permission.category?.toLowerCase().includes(permissionSearch.toLowerCase())
                      )
                    )
                      .map((permission: Permission) => (
                      <div key={permission.name || permission.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">{permission.name || 'Unnamed Permission'}</Label>
                          {permission.description && (
                            <p className="text-xs text-medium-gray">{permission.description}</p>
                          )}
                          {permission.category && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {permission.category}
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={(() => {
                            const selectedUserData = (usersWithPermissions as UserWithPermissions[])?.find((u: UserWithPermissions) => u.id === selectedUser);
                            // No record = permission uses role default (not explicitly granted); show as off
                            const perm = selectedUserData?.permissions?.find((p: any) => p && p.name === permission.name);
                            return perm?.granted ?? false;
                          })()}
                          onCheckedChange={(checked) => handlePermissionToggle(selectedUser, permission.name, checked)}
                          disabled={!canManagePermissions}
                          showStatusIndicator={true}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-medium-gray py-8">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a user to manage their permissions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
              <CardDescription>
                Manage different types of notifications in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Types Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <i className="fas fa-info-circle"></i>
                  Notification Types
                </h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-rocket mt-1 text-blue-600"></i>
                    <div>
                      <strong>Deployment Notifications:</strong> Updates from GitHub Actions and Watchtower container updates. 
                      Clear these manually below ({Array.isArray(notifications) ? notifications.length : 0} active).
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-bell mt-1 text-blue-600"></i>
                    <div>
                      <strong>Low Stock Alerts:</strong> Automatic alerts when inventory falls below minimum thresholds. 
                      These clear automatically when you restock items in the Inventory page.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-server mt-1 text-blue-600"></i>
                    <div>
                      <strong>System Alerts:</strong> Critical system monitoring and health check notifications. 
                      Resolve these from the System Management page.
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear Deployment Notifications */}
              <div className="flex items-center justify-between p-4 bg-muted/50 border-2 rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <i className="fas fa-rocket text-blue-600"></i>
                    Clear Deployment Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remove all deployment and update notifications
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-sm">
                      {Array.isArray(notifications) ? notifications.length : 0} active
                    </Badge>
                  </div>
                </div>
                <div className="ml-4">
                  {canEditSettings ? (
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all deployment notifications? This action cannot be undone.')) {
                          clearAllNotificationsMutation.mutate();
                        }
                      }}
                      disabled={clearAllNotificationsMutation.isPending || !Array.isArray(notifications) || notifications.length === 0}
                      className="min-w-[120px]"
                    >
                      {clearAllNotificationsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash mr-2"></i>
                          Clear ({Array.isArray(notifications) ? notifications.length : 0})
                        </>
                      )}
                    </Button>
                  ) : (
                    <Alert className="m-0 p-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Admin access required
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Clear Low Stock Notifications */}
              <div className="flex items-center justify-between p-4 bg-muted/50 border-2 rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <i className="fas fa-bell text-orange-600"></i>
                    Acknowledge Low Stock Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Temporarily hide low stock alerts (they'll reappear when inventory changes)
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-sm">
                      {Array.isArray(lowStockItems) ? lowStockItems.length : 0} active
                    </Badge>
                  </div>
                </div>
                <div className="ml-4">
                  {canEditSettings ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => clearLowStockMutation.mutate()}
                      disabled={clearLowStockMutation.isPending || !Array.isArray(lowStockItems) || lowStockItems.length === 0}
                      className="min-w-[120px]"
                    >
                      {clearLowStockMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check mr-2"></i>
                          Acknowledge ({Array.isArray(lowStockItems) ? lowStockItems.length : 0})
                        </>
                      )}
                    </Button>
                  ) : (
                    <Alert className="m-0 p-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Admin access required
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Clear All Notification Types */}
              <div className="flex items-center justify-between p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                    Clear All Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clear both deployment notifications and acknowledge all low stock alerts at once
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-sm">
                      {(Array.isArray(notifications) ? notifications.length : 0) + (Array.isArray(lowStockItems) ? lowStockItems.length : 0)} total
                    </Badge>
                  </div>
                </div>
                <div className="ml-4">
                  {canEditSettings ? (
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => {
                        if (confirm('Are you sure you want to clear ALL notifications? This includes deployment notifications and low stock alerts.')) {
                          clearAllTypesMutation.mutate();
                        }
                      }}
                      disabled={clearAllTypesMutation.isPending || 
                        (!Array.isArray(notifications) || notifications.length === 0) && 
                        (!Array.isArray(lowStockItems) || lowStockItems.length === 0)}
                      className="min-w-[140px]"
                    >
                      {clearAllTypesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash-alt mr-2"></i>
                          Clear All ({(Array.isArray(notifications) ? notifications.length : 0) + (Array.isArray(lowStockItems) ? lowStockItems.length : 0)})
                        </>
                      )}
                    </Button>
                  ) : (
                    <Alert className="m-0 p-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Admin access required
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="space-y-4">
          <DatabaseSchemaManager />
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <EnhancedDatabaseMigration />
        </TabsContent>

        <TabsContent value="labels" className="space-y-4">
          <LabelPrinting />
        </TabsContent>
      </Tabs>
    </div>
  );
}
