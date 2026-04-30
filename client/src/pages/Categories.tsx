import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from '@/components/shared/EmptyState';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Tag } from "lucide-react";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Name must be less than 50 characters"),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().min(1, "Color is required"),
});

type CategoryForm = z.infer<typeof categorySchema>;

interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color: string;
}

interface CategoryStat {
  category: Category;
  itemCount: number;
  totalValue: number;
}

const colorOptions = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "brown", label: "Brown", class: "bg-amber-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
  { value: "teal", label: "Teal", class: "bg-teal-500" },
];

const iconOptions = [
  { value: "fas fa-laptop", label: "Laptop" },
  { value: "fas fa-chair", label: "Chair" },
  { value: "fas fa-book", label: "Book" },
  { value: "fas fa-flask", label: "Lab Equipment" },
  { value: "fas fa-tools", label: "Tools" },
  { value: "fas fa-stethoscope", label: "Medical" },
  { value: "fas fa-car", label: "Vehicle" },
  { value: "fas fa-home", label: "Furniture" },
  { value: "fas fa-paperclip", label: "Office Supplies" },
  { value: "fas fa-palette", label: "Art Supplies" },
  { value: "fas fa-basketball-ball", label: "Sports" },
  { value: "fas fa-microchip", label: "Electronics" },
  { value: "fas fa-wrench", label: "Maintenance" },
  { value: "fas fa-graduation-cap", label: "Educational" },
  { value: "fas fa-box", label: "General" },
];

export default function Categories() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: categoryStats } = useQuery<CategoryStat[]>({
    queryKey: ["/api/dashboard/category-stats"],
  });

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "fas fa-box",
      color: "blue",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/category-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      // Force immediate refetch to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingCategory(null);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) => apiRequest("PATCH", `/api/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/category-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      // Force immediate refetch to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingCategory(null);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/category-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "fas fa-box",
      color: category.color || "blue",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    const itemCount = categoryStats?.find((stat: CategoryStat) => stat.category?.id === category.id)?.itemCount || 0;
    
    if (itemCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `This category contains ${itemCount} items. Move or delete the items first.`,
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      icon: "fas fa-box",
      color: "blue",
    });
    setIsDialogOpen(true);
  };

  const getColorClass = (color: string) => {
    // Use custom category classes for better styling when available
    const categoryClassMap: Record<string, string> = {
      blue: "category-blue",
      green: "category-green", 
      orange: "category-orange",
      purple: "category-purple",
      brown: "category-brown",
    };
    
    if (categoryClassMap[color]) {
      return categoryClassMap[color];
    }
    
    // Fall back to solid colors with white text for other options
    const solidColorMap: Record<string, string> = {
      red: "bg-red-500 text-white",
      yellow: "bg-yellow-500 text-white",
      pink: "bg-pink-500 text-white",
      indigo: "bg-indigo-500 text-white",
      gray: "bg-gray-500 text-white",
      teal: "bg-teal-500 text-white",
    };
    
    return solidColorMap[color] || "bg-gray-500 text-white";
  };

  const getCategoryStats = (categoryId: number) => {
    return categoryStats?.find((stat: CategoryStat) => stat.category?.id === categoryId);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-blue mx-auto mb-4"></div>
            <p className="text-medium-gray">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Category Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={openCreateDialog}
              className="bg-university-blue hover:bg-university-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create New Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory 
                  ? "Update the category details below."
                  : "Add a new category to organize your inventory items."
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Category name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this category"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center space-x-2">
                                <i className={`${icon.value} text-sm`}></i>
                                <span>{icon.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${color.class}`}></div>
                                <span>{color.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-university-blue hover:bg-university-dark"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      "Processing..."
                    ) : (
                      editingCategory ? "Update Category" : "Create Category"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Categories</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category: Category) => {
                const stats = getCategoryStats(category.id);
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg ${getColorClass(category.color)} flex items-center justify-center`}>
                          <i className={`${category.icon || 'fas fa-box'} text-sm`}></i>
                        </div>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <Badge variant="outline" className="mt-1">
                            <div className={`w-2 h-2 rounded-full ${getColorClass(category.color)} mr-1`}></div>
                            {category.color}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-medium-gray max-w-xs">
                        {category.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {stats?.itemCount || 0} items
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        £{(stats?.totalValue || 0).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          
          {(!categories || categories.length === 0) && (
            <EmptyState
              icon={<Tag className="h-12 w-12" />}
              title="No categories found"
              description="Create your first category to organize inventory items"
              action={{
                label: "Add Category",
                onClick: openCreateDialog
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}