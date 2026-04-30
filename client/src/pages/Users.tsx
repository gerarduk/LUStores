import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from '@/components/shared/EmptyState';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { getRoleDisplayName, getRoleBadgeClass } from "@/lib/roleUtils";
import type { User } from "@shared/schema";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'superuser' | 'admin';
  isActive: boolean;
  lastLogin: string | null;
  createdAt?: string;
  profileImageUrl?: string;
}

interface PasswordResetResponse {
  temporaryPassword?: string;
  message?: string;
}

interface CurrentUser {
  id: string;
  role: 'user' | 'superuser' | 'admin';
  email?: string;
  firstName?: string;
  lastName?: string;
}

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.union([z.literal("user"), z.literal("superuser"), z.literal("admin")]),
});

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    temporaryPassword: string;
    userEmail: string;
  }>({
    isOpen: false,
    temporaryPassword: '',
    userEmail: '',
  });

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "user",
    },
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof createUserSchema>) => {
      await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation<PasswordResetResponse, Error, string>({
    mutationFn: async (userId: string): Promise<PasswordResetResponse> => {
      console.log("🔑 Starting password reset for user:", userId);
      // Use GET route with system namespace - requires authentication
      const res = await apiRequest("GET", `/api/system/reset-user-password/${userId}`);
      const result = await res.json();
      console.log("🔑 Password reset result keys:", Object.keys(result));
      return result as PasswordResetResponse;
    },
    onSuccess: (data: PasswordResetResponse, userId: string) => {
      console.log("🔑 Password reset successful, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      // Find the user to get their email for the modal
      const user = users?.find(u => u.id === userId);
      const userEmail = user?.email || 'Unknown User';

      const tempPassword = data?.temporaryPassword ?? "No temporary password returned";

      // Show the one-time password reset modal instead of toast
      setPasswordResetModal({
        isOpen: true,
        temporaryPassword: tempPassword,
        userEmail: userEmail,
      });
    },
    onError: (error) => {
      console.error("🔑 Password reset error:", error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log("🗑️ Starting user deletion for user:", userId);
      const result = await apiRequest("DELETE", `/api/admin/remove-user/${userId}`, {});
      console.log("🗑️ User deletion result:", result);
      return result;
    },
    onSuccess: () => {
      console.log("🗑️ User deletion successful, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Removed Successfully",
        description: "User has been deactivated from the system",
      });
    },
    onError: (error) => {
      console.error("🗑️ User deletion error:", error);
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const onSubmit = (values: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(values);
  };

  const canManageUsers = (currentUser as CurrentUser)?.role === "admin" || (currentUser as CurrentUser)?.role === "superuser";

  if ((currentUser as CurrentUser)?.role !== "admin") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-lock text-4xl text-medium-gray mb-4"></i>
              <h2 className="text-xl font-semibold text-charcoal mb-2">Access Denied</h2>
              <p className="text-medium-gray">
                You need administrator privileges to access user management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">User Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-medium-gray">
            Total Users: {Array.isArray(users) ? users.length : 0}
          </div>
          {canManageUsers && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-university-blue hover:bg-university-dark">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="superuser">Manager</SelectItem>
                              {(currentUser as CurrentUser)?.role === "admin" && (
                                <SelectItem value="admin">System Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                        className="bg-university-blue hover:bg-university-dark"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(users) ? users.map((user: User) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.profileImageUrl} alt={user.firstName || user.email} />
                    <AvatarFallback>
                      {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-charcoal">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email}
                    </h3>
                    <p className="text-sm text-medium-gray">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getRoleBadgeClass(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      {user.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="text-xs text-medium-gray">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                  {user.id !== (currentUser as CurrentUser)?.id && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="superuser">Manager</SelectItem>
                          {canManageUsers && (
                            <SelectItem value="admin">System Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetPasswordMutation.mutate(user.id)}
                        disabled={resetPasswordMutation.isPending}
                        className="text-xs px-2"
                      >
                        <i className="fas fa-key mr-1"></i>
                        Reset
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${user.firstName || user.email}? This action cannot be undone.`)) {
                            deleteUserMutation.mutate(user.id);
                          }
                        }}
                        disabled={deleteUserMutation.isPending}
                        className="text-xs px-2"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )) : null}

            {(!users || !Array.isArray(users) || users.length === 0) && (
              <EmptyState
                icon={<UserPlus className="h-12 w-12" />}
                title="No users found"
                description="Add your first user to get started"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Reset Modal */}
      <Dialog
        open={passwordResetModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Clear the modal state when closing
            setPasswordResetModal({
              isOpen: false,
              temporaryPassword: '',
              userEmail: '',
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">
              <i className="fas fa-check-circle text-2xl mb-2"></i>
              Password Reset Successful
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              A new temporary password has been generated for <strong>{passwordResetModal.userEmail}</strong>.
            </p>
            <div className="bg-muted p-4 rounded-lg border-2 border-dashed border-border">
              <p className="text-xs text-gray-500 mb-1">Temporary Password:</p>
              <p className="text-xl font-mono font-bold text-blue-600 select-all">
                {passwordResetModal.temporaryPassword}
              </p>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>⚠️ <strong>Important:</strong> This password will only be shown once.</p>
              <p>Make sure to copy it now and share it securely with the user.</p>
              <p>The user will be required to change this password on first login.</p>
            </div>
            <Button
              onClick={() => {
                setPasswordResetModal({
                  isOpen: false,
                  temporaryPassword: '',
                  userEmail: '',
                });
              }}
              className="w-full"
            >
              I Have Copied the Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
