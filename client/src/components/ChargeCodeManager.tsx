/**
 * Charge Code Assignment Manager Component
 *
 * INTEGRATION: Import and use in Users.tsx
 * Usage: <ChargeCodeManager userId={user.id} userName={user.email} />
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { X, CreditCard } from 'lucide-react';

interface ChargeCodeManagerProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AssignedChargeCode {
  code: string;
  title: string;
  assignedBy: string | null;
  assignedAt: Date | null;
  notes: string | null;
}

interface ChargeCode {
  code: string;
  title: string;
}

export function ChargeCodeManager({
  userId,
  userName,
  isOpen,
  onClose,
}: ChargeCodeManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's assigned charge codes
  const { data: userChargeCodes, isLoading: loadingAssignments } = useQuery<AssignedChargeCode[]>({
    queryKey: ['user-charge-codes', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/charge-codes`);
      return response.json();
    },
    enabled: isOpen && !!userId,
  });

  // Fetch all available charge codes
  const { data: allChargeCodes, isLoading: loadingAll } = useQuery<ChargeCode[]>({
    queryKey: ['all-charge-codes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chargecodes');
      return response.json();
    },
    enabled: isOpen,
  });

  // Assign charge code mutation
  const assignMutation = useMutation({
    mutationFn: async (chargeCode: string) => {
      await apiRequest('POST', `/api/users/${userId}/charge-codes`, {
        chargeCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-charge-codes', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'Charge code assigned successfully',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign charge code';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Remove charge code mutation
  const removeMutation = useMutation({
    mutationFn: async (chargeCode: string) => {
      await apiRequest('DELETE', `/api/users/${userId}/charge-codes/${chargeCode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-charge-codes', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'Charge code removed successfully',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove charge code';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Filter out already assigned codes
  const availableCodes = allChargeCodes?.filter(
    (code) => !userChargeCodes?.some((assigned) => assigned.code === code.code)
  );

  const isLoading = loadingAssignments || loadingAll;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Charge Codes - {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assigned Charge Codes */}
          <div>
            <Label className="text-base font-semibold">Assigned Charge Codes</Label>
            <div className="mt-3 flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-lg bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : userChargeCodes && userChargeCodes.length > 0 ? (
                userChargeCodes.map((cc) => (
                  <Badge
                    key={cc.code}
                    className="text-sm px-3 py-1.5 bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    <span className="font-medium">{cc.code}</span>
                    <span className="mx-1">•</span>
                    <span>{cc.title}</span>
                    <button
                      onClick={() => removeMutation.mutate(cc.code)}
                      disabled={removeMutation.isPending}
                      className="ml-2 hover:text-red-600 transition-colors"
                      title="Remove charge code"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic w-full text-center py-4">
                  No charge codes assigned. Add one below to get started.
                </p>
              )}
            </div>
            {userChargeCodes && userChargeCodes.length > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                {userChargeCodes.length} charge code{userChargeCodes.length !== 1 ? 's' : ''}{' '}
                assigned
              </p>
            )}
          </div>

          {/* Add Charge Code */}
          <div>
            <Label className="text-base font-semibold">Add Charge Code</Label>
            <div className="mt-3">
              <Select
                onValueChange={(code) => assignMutation.mutate(code)}
                disabled={assignMutation.isPending || isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a charge code to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCodes && availableCodes.length > 0 ? (
                    availableCodes.map((cc) => (
                      <SelectItem key={cc.code} value={cc.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cc.code}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-700">{cc.title}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {isLoading
                        ? 'Loading...'
                        : 'All charge codes have been assigned'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {availableCodes && availableCodes.length === 0 && !isLoading && (
                <p className="mt-2 text-xs text-gray-600">
                  All available charge codes have been assigned to this user.
                </p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Note:</strong> Charge codes determine which sales this user can create. Basic
              users can only use their assigned charge codes, while managers and admins can use
              any charge code.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
