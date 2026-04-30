import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SearchInput from '@/components/shared/SearchInput';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import NotesIndicator from "@/components/NotesIndicator";

interface AuthorizedUser {
  id?: number;
  userName: string;
  email?: string;
  department?: string;
  notes?: string;
}

interface ChargeCode {
  code: string;
  title: string;
  authorisedBy: string;
  validFrom?: string;
  validUntil?: string;
  pin?: string;
  costCentre?: string;
  activity?: string;
  cat3?: string;
  createdAt: string;
  updatedAt: string;
  authorizedUsers?: AuthorizedUser[];
  onHold?: boolean;
  holdReason?: string;
  heldAt?: string;
  heldBy?: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface ChargeCodeExclusion {
  chargeCode: string;
  excludedCategoryIds: number[];
  excludedCategories: Category[];
}

interface ChargeCodeForm {
  code: string;
  title: string;
  authorisedBy: string;
  validFrom: string;
  validUntil: string;
  pin: string;
  costCentre: string;
  activity: string;
  cat3: string;
}

export default function ChargeCodes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [managingExclusionsFor, setManagingExclusionsFor] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [newAuthorizedUser, setNewAuthorizedUser] = useState({ userName: "", email: "", department: "" });
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdingChargeCode, setHoldingChargeCode] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [formData, setFormData] = useState<ChargeCodeForm>({
    code: "",
    title: "",
    authorisedBy: "",
    validFrom: "",
    validUntil: "",
    pin: "",
    costCentre: "",
    activity: "",
    cat3: "",
  });

  // Fetch charge codes
  const { data: chargeCodes, isLoading } = useQuery<ChargeCode[]>({
    queryKey: ["/api/chargecodes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/chargecodes");
      return await response.json();
    },
  });

  // Batch fetch notes counts for all charge codes
  const { data: notesCounts } = useQuery({
    queryKey: ["/api/notes/counts/batch", chargeCodes?.map(cc => cc.code)],
    queryFn: async () => {
      if (!chargeCodes || chargeCodes.length === 0) return {};
      
      const entities = chargeCodes.map(cc => ({
        referenceType: "chargecode",
        referenceId: cc.code
      }));
      
      const response = await apiRequest("POST", "/api/notes/counts/batch", { entities });
      const data = await response.json();
      
      // Convert array to map for easy lookup
      return data.counts.reduce((acc: Record<string, number>, item: { referenceId: string; count: number }) => {
        acc[item.referenceId] = item.count;
        return acc;
      }, {});
    },
    enabled: !!chargeCodes && chargeCodes.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Create charge code mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ChargeCodeForm>) => {
      return apiRequest("POST", "/api/chargecodes", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Charge code created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chargecodes"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create charge code.",
        variant: "destructive",
      });
    },
  });

  // Update charge code mutation
  const updateMutation = useMutation({
    mutationFn: async ({ code, data }: { code: string; data: Partial<ChargeCodeForm> }) => {
      return apiRequest("PUT", `/api/chargecodes/${code}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Charge code updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chargecodes"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update charge code.",
        variant: "destructive",
      });
    },
  });

  // Delete charge code mutation
  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("DELETE", `/api/chargecodes/${code}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Charge code deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chargecodes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete charge code.",
        variant: "destructive",
      });
    },
  });

  // Toggle hold status mutation
  const toggleHoldMutation = useMutation({
    mutationFn: async ({ code, onHold, holdReason }: { code: string; onHold: boolean; holdReason?: string }) => {
      const response = await apiRequest("PATCH", `/api/chargecodes/${code}/hold`, { onHold, holdReason });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: variables.onHold
          ? "Charge code has been put on hold."
          : "Charge code has been reactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chargecodes"] });
      setHoldDialogOpen(false);
      setHoldReason("");
      setHoldingChargeCode(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update hold status.",
        variant: "destructive",
      });
    },
  });

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories");
      return await response.json();
    },
  });

  // Fetch exclusions for a specific charge code
  const { data: exclusions, refetch: refetchExclusions } = useQuery<ChargeCodeExclusion>({
    queryKey: ["/api/chargecodes", managingExclusionsFor, "exclusions"],
    queryFn: async () => {
      if (!managingExclusionsFor) return null;
      const response = await apiRequest("GET", `/api/chargecodes/${managingExclusionsFor}/exclusions`);
      return await response.json();
    },
    enabled: !!managingExclusionsFor,
  });

  // Add exclusion mutation
  const addExclusionMutation = useMutation({
    mutationFn: async ({ chargeCode, categoryId }: { chargeCode: string; categoryId: number }) => {
      return apiRequest("POST", `/api/chargecodes/${chargeCode}/exclusions`, { categoryId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exclusion added successfully.",
      });
      refetchExclusions();
      setSelectedCategoryId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add exclusion.",
        variant: "destructive",
      });
    },
  });

  // Remove exclusion mutation
  const removeExclusionMutation = useMutation({
    mutationFn: async ({ chargeCode, categoryId }: { chargeCode: string; categoryId: number }) => {
      return apiRequest("DELETE", `/api/chargecodes/${chargeCode}/exclusions/${categoryId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exclusion removed successfully.",
      });
      refetchExclusions();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove exclusion.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      title: "",
      authorisedBy: "",
      validFrom: "",
      validUntil: "",
      pin: "",
      costCentre: "",
      activity: "",
      cat3: "",
    });
    setAuthorizedUsers([]);
    setNewAuthorizedUser({ userName: "", email: "", department: "" });
    setEditingCode(null);
    setFormDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.title) {
      toast({
        title: "Error",
        description: "Code and title are required.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      validFrom: formData.validFrom?.trim() === "" ? null : formData.validFrom?.trim() || null,
      validUntil: formData.validUntil?.trim() === "" ? null : formData.validUntil?.trim() || null,
      pin: formData.pin || undefined,
      costCentre: formData.costCentre || undefined,
      activity: formData.activity || undefined,
      cat3: formData.cat3 || undefined,
      authorizedUsers: authorizedUsers,
    };

    if (editingCode) {
      updateMutation.mutate({ code: editingCode, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (chargeCode: ChargeCode) => {
    setFormData({
      code: chargeCode.code,
      title: chargeCode.title,
      authorisedBy: chargeCode.authorisedBy,
      validFrom: chargeCode.validFrom ? chargeCode.validFrom.split('T')[0] : "",
      validUntil: chargeCode.validUntil ? chargeCode.validUntil.split('T')[0] : "",
      pin: chargeCode.pin || "",
      costCentre: chargeCode.costCentre || "",
      activity: chargeCode.activity || "",
      cat3: chargeCode.cat3 || "",
    });
    setAuthorizedUsers(chargeCode.authorizedUsers || []);
    setEditingCode(chargeCode.code);
    setFormDialogOpen(true);
  };

  const handleAddAuthorizedUser = () => {
    if (!newAuthorizedUser.userName.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setAuthorizedUsers(prev => [...prev, { ...newAuthorizedUser }]);
    setNewAuthorizedUser({ userName: "", email: "", department: "" });
  };

  const handleRemoveAuthorizedUser = (index: number) => {
    setAuthorizedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const handleDelete = (code: string) => {
    if (confirm(`Are you sure you want to delete charge code "${code}"? This action cannot be undone.`)) {
      deleteMutation.mutate(code);
    }
  };

  const handleToggleHold = (chargeCode: ChargeCode) => {
    if (chargeCode.onHold) {
      // Reactivate the code (no reason needed)
      toggleHoldMutation.mutate({
        code: chargeCode.code,
        onHold: false,
      });
    } else {
      // Put on hold (show dialog for reason)
      setHoldingChargeCode(chargeCode.code);
      setHoldDialogOpen(true);
    }
  };

  const handleConfirmHold = () => {
    if (holdingChargeCode) {
      toggleHoldMutation.mutate({
        code: holdingChargeCode,
        onHold: true,
        holdReason: holdReason.trim() || undefined,
      });
    }
  };

  const isExpiringSoon = (validUntil?: string) => {
    if (!validUntil) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  };

  const isExpired = (validUntil?: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const handleAddExclusion = () => {
    if (!managingExclusionsFor || !selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select a category to exclude.",
        variant: "destructive",
      });
      return;
    }

    addExclusionMutation.mutate({
      chargeCode: managingExclusionsFor,
      categoryId: parseInt(selectedCategoryId),
    });
  };

  const handleRemoveExclusion = (categoryId: number) => {
    if (!managingExclusionsFor) return;

    removeExclusionMutation.mutate({
      chargeCode: managingExclusionsFor,
      categoryId,
    });
  };

  const getAvailableCategories = () => {
    if (!categories || !exclusions) return categories || [];

    return categories.filter(
      category => !exclusions.excludedCategoryIds.includes(category.id)
    );
  };

  const filteredChargeCodes = chargeCodes?.filter((chargeCode) =>
    chargeCode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chargeCode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chargeCode.costCentre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chargeCode.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chargeCode.cat3?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Charge Code Management</h1>
        <Button onClick={() => {
          setFormDialogOpen(true);
        }}>
          <i className="fas fa-plus mr-2"></i>
          Add New Charge Code
        </Button>
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <i className="fas fa-edit mr-2 text-university-blue"></i>
              {editingCode ? `Edit Charge Code: ${editingCode}` : "Add New Charge Code"}
            </DialogTitle>
            <DialogDescription>
              {editingCode
                ? "Update the charge code details below. Leave date fields blank for indefinite validity."
                : "Create a new charge code. Leave date fields blank for indefinite validity."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., DEPT001, BIOLOGY"
                  disabled={!!editingCode}
                  required
                />
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Biology Department Budget"
                  required
                />
              </div>
              <div>
                <Label htmlFor="costCentre">Cost Centre</Label>
                <Input
                  id="costCentre"
                  value={formData.costCentre}
                  onChange={(e) => setFormData(prev => ({ ...prev, costCentre: e.target.value }))}
                  placeholder="e.g., CC001"
                />
              </div>
              <div>
                <Label htmlFor="activity">Activity</Label>
                <Input
                  id="activity"
                  value={formData.activity}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity: e.target.value }))}
                  placeholder="e.g., Lab Equipment, Research Supplies"
                />
              </div>
              <div>
                <Label htmlFor="cat3">Cat3 (Add-on Person)</Label>
                <Input
                  id="cat3"
                  value={formData.cat3}
                  onChange={(e) => setFormData(prev => ({ ...prev, cat3: e.target.value }))}
                  placeholder="e.g., Additional staff member"
                />
              </div>
              <div>
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={formData.pin}
                  onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="Optional PIN for additional security"
                />
              </div>
              <div>
                <Label htmlFor="validFrom">Valid From</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for no start date</p>
              </div>
              <div>
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for indefinite validity</p>
              </div>
            </div>

            {/* Authorized People Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <i className="fas fa-users mr-2 text-university-blue"></i>
                Authorized People
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add names of people authorized to use this charge code. This list will be shown for verification when the charge code is used.
              </p>

              {/* Add new authorized person */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                <Input
                  placeholder="Name *"
                  value={newAuthorizedUser.userName}
                  onChange={(e) => setNewAuthorizedUser(prev => ({ ...prev, userName: e.target.value }))}
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={newAuthorizedUser.email}
                  onChange={(e) => setNewAuthorizedUser(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  placeholder="Department (optional)"
                  value={newAuthorizedUser.department}
                  onChange={(e) => setNewAuthorizedUser(prev => ({ ...prev, department: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAuthorizedUser}
                  className="whitespace-nowrap"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Name
                </Button>
              </div>

              {/* List of authorized people */}
              {authorizedUsers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Authorized People ({authorizedUsers.length})</Label>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {authorizedUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-accent">
                        <div className="flex-1">
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email && <span className="mr-3"><i className="fas fa-envelope mr-1"></i>{user.email}</span>}
                            {user.department && <span><i className="fas fa-building mr-1"></i>{user.department}</span>}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAuthorizedUser(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fas fa-save mr-2"></i>
                )}
                {editingCode ? "Update" : "Create"} Charge Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Charge Codes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-list mr-2 text-university-blue"></i>
              Charge Codes ({filteredChargeCodes?.length || 0}{searchTerm && ` of ${chargeCodes?.length || 0}`})
            </div>
          </CardTitle>
          <div className="mt-4">
            <SearchInput
              placeholder="Search by code, title, cost centre, activity, or cat3..."
              value={searchTerm}
              onChange={(value) => setSearchTerm(value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredChargeCodes && filteredChargeCodes.length > 0 ? (
              filteredChargeCodes.map((chargeCode) => (
                <div
                  key={chargeCode.code}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isExpired(chargeCode.validUntil)
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : isExpiringSoon(chargeCode.validUntil)
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{chargeCode.code}</h3>
                      {isExpired(chargeCode.validUntil) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {!isExpired(chargeCode.validUntil) && isExpiringSoon(chargeCode.validUntil) && (
                        <Badge variant="secondary">Expiring Soon</Badge>
                      )}
                      {chargeCode.pin && (
                        <Badge variant="outline">
                          <i className="fas fa-lock mr-1"></i>
                          PIN Protected
                        </Badge>
                      )}
                      {chargeCode.onHold && (
                        <Badge variant="destructive" className="bg-orange-600">
                          <i className="fas fa-pause-circle mr-1"></i>
                          On Hold
                        </Badge>
                      )}
                    </div>
                    <p className="text-medium-gray mb-1">{chargeCode.title}</p>
                    {chargeCode.onHold && chargeCode.holdReason && (
                      <p className="text-sm text-orange-700 italic mb-1">
                        <i className="fas fa-info-circle mr-1"></i>
                        Hold reason: {chargeCode.holdReason}
                      </p>
                    )}
                    <div className="text-sm text-medium-gray space-y-1">
                      <div>
                        {chargeCode.costCentre && (
                          <span className="mr-4">Cost Centre: {chargeCode.costCentre}</span>
                        )}
                        {chargeCode.activity && (
                          <span className="mr-4">Activity: {chargeCode.activity}</span>
                        )}
                        {chargeCode.cat3 && (
                          <span className="mr-4">Cat3: {chargeCode.cat3}</span>
                        )}
                      </div>
                      <div>
                        {chargeCode.validFrom && (
                          <span className="mr-4">
                            Valid from: {new Date(chargeCode.validFrom).toLocaleDateString()}
                          </span>
                        )}
                        {chargeCode.validUntil && (
                          <span className={
                            isExpired(chargeCode.validUntil)
                              ? 'text-red-600 font-medium'
                              : isExpiringSoon(chargeCode.validUntil)
                              ? 'text-orange-600 font-medium'
                              : ''
                          }>
                            Valid until: {new Date(chargeCode.validUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {/* Authorized Users */}
                      {chargeCode.authorizedUsers && chargeCode.authorizedUsers.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <i className="fas fa-users mr-1"></i>
                            Authorized ({chargeCode.authorizedUsers.length}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {chargeCode.authorizedUsers.slice(0, 3).map((user, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {user.userName}
                              </Badge>
                            ))}
                            {chargeCode.authorizedUsers.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{chargeCode.authorizedUsers.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <NotesIndicator
                      referenceType="chargecode"
                      referenceId={chargeCode.code}
                      entityName={`Charge Code ${chargeCode.code}`}
                      initialCount={notesCounts?.[chargeCode.code] ?? 0}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(chargeCode)}
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={chargeCode.onHold ? "default" : "outline"}
                      onClick={() => handleToggleHold(chargeCode)}
                      className={chargeCode.onHold ? "bg-orange-600 hover:bg-orange-700" : ""}
                    >
                      <i className={`fas ${chargeCode.onHold ? 'fa-play' : 'fa-pause'} mr-1`}></i>
                      {chargeCode.onHold ? 'Reactivate' : 'Hold'}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManagingExclusionsFor(chargeCode.code)}
                        >
                          <i className="fas fa-ban mr-1"></i>
                          Exclusions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            Manage Exclusions for {chargeCode.code}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Current exclusions */}
                          <div>
                            <h4 className="font-medium mb-2">Current Exclusions:</h4>
                            {exclusions?.excludedCategories.length ? (
                              <div className="space-y-2">
                                {exclusions.excludedCategories.map((category) => (
                                  <div
                                    key={category.id}
                                    className="flex items-center justify-between p-2 bg-muted rounded"
                                  >
                                    <div className="flex items-center gap-2">
                                      <i className={`${category.icon} text-${category.color}-600`}></i>
                                      <span>{category.name}</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRemoveExclusion(category.id)}
                                      disabled={removeExclusionMutation.isPending}
                                    >
                                      <i className="fas fa-times"></i>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No exclusions set</p>
                            )}
                          </div>

                          {/* Add new exclusion */}
                          <div>
                            <h4 className="font-medium mb-2">Add Exclusion:</h4>
                            <div className="flex gap-2">
                              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select category to exclude" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableCategories().map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <i className={`${category.icon} text-${category.color}-600`}></i>
                                        {category.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={handleAddExclusion}
                                disabled={!selectedCategoryId || addExclusionMutation.isPending}
                              >
                                {addExclusionMutation.isPending ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <i className="fas fa-plus"></i>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(chargeCode.code)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-trash"></i>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                {searchTerm ? (
                  <>
                    <p className="text-medium-gray mb-4">No charge codes match your search</p>
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      <i className="fas fa-times mr-2"></i>
                      Clear Search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-medium-gray mb-4">No charge codes found</p>
                    <Button onClick={() => setFormDialogOpen(true)}>
                      <i className="fas fa-plus mr-2"></i>
                      Add Your First Charge Code
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hold Reason Dialog */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put Charge Code on Hold</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to put charge code <strong>{holdingChargeCode}</strong> on hold.
              This will prevent it from being used until it is reactivated.
            </p>
            <div>
              <Label htmlFor="hold-reason">Reason (optional)</Label>
              <Input
                id="hold-reason"
                placeholder="e.g., Near budget limit, pending approval..."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Providing a reason helps others understand why the code is on hold.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setHoldDialogOpen(false);
                setHoldReason("");
                setHoldingChargeCode(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmHold}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Put on Hold
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
