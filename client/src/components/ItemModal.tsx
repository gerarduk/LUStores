import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Category, ItemWithCategory } from "@shared/schema";
import { z } from "zod";

interface SupplierOrderData {
  supplier?: {
    name: string;
  };
  orderCount: number;
  totalQuantity: number;
  lastOrderDate: string;
  averagePrice: number;
  orders?: Array<{
    orderNumber: string;
    quantity: number;
    price: number;
    orderDate: string;
  }>;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: ItemWithCategory | null;
  categories: Category[];
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  price: z.string().min(1, "Price is required"),
  vatRate: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 1;
  }, {
    message: "VAT rate must be between 0 and 1 (e.g., 0.20 for 20%)",
  }),
  vatIncluded: z.boolean(),
  currentStock: z.string().refine((val) => val.length > 0 && !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Current stock must be a valid number (0 or greater)",
  }),
  minimumStock: z.string().refine((val) => val.length > 0 && !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Minimum stock must be a valid number (0 or greater)",
  }),
  unit: z.string().min(1, "Unit is required"),
  location: z.string().optional(),
});

export default function ItemModal({
  isOpen,
  onClose,
  item,
  categories,
}: ItemModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch VAT rates from settings
  const { data: vatRatesData } = useQuery({
    queryKey: ['/api/settings/vat-rates'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings/vat-rates");
      const data = await response.json();
      return data;
    },
  });

  // Fetch order history for existing items
  const { data: orderHistory = [] } = useQuery({
    queryKey: ['/api/items', item?.id, 'order-history'],
    queryFn: async () => {
      if (!item?.id) return [];
      const response = await apiRequest("GET", `/api/items/${item.id}/order-history`);
      const data = await response.json();
      return data;
    },
    enabled: !!item?.id,
  });

  const vatRates = vatRatesData?.vatRates || [];

  // Debug logging to check if categories are being passed
  console.log("ItemModal categories:", categories);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      price: "",
      vatRate: "0.2000", // Default 20% VAT
      vatIncluded: false,
      currentStock: "",
      minimumStock: "",
      unit: "pieces",
      location: "",
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        sku: item.sku,
        description: item.description || "",
        categoryId: item.categoryId.toString(),
        price: item.price,
        vatRate: item.vatRate || "0.2000",
        vatIncluded: item.vatIncluded !== undefined ? item.vatIncluded : true,
        currentStock: item.currentStock.toString(),
        minimumStock: item.minimumStock.toString(),
        unit: item.unit || "pieces",
        location: item.location || "",
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        description: "",
        categoryId: "",
        price: "",
        vatRate: "0.2000",
        vatIncluded: false,
        currentStock: "",
        minimumStock: "",
        unit: "pieces",
        location: "",
      });
    }
  }, [item, form]);

  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const payload = {
        ...data,
        categoryId: parseInt(data.categoryId),
        price: data.price,
        vatRate: parseFloat(data.vatRate),
        vatIncluded: data.vatIncluded,
        currentStock: parseFloat(data.currentStock),
        minimumStock: parseFloat(data.minimumStock),
        unit: data.unit,
        location: data.location || null,
      };

      return await apiRequest("POST", "/api/items", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Item created successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Create item error:", error);
      setIsSubmitting(false);
      toast({
        title: "Failed to Create Item",
        description:
          error.message ||
          "Unable to add item. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const payload = {
        ...data,
        categoryId: parseInt(data.categoryId),
        price: data.price,
        vatRate: parseFloat(data.vatRate),
        vatIncluded: data.vatIncluded,
        currentStock: parseFloat(data.currentStock),
        minimumStock: parseFloat(data.minimumStock),
        unit: data.unit,
        location: data.location || null,
      };

      return await apiRequest("PUT", `/api/items/${item!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    // Add timeout for better UX
    const timeoutId = setTimeout(() => {
      if (isSubmitting) {
        toast({
          title: "Taking longer than expected...",
          description: "The request is still processing. Please wait a moment.",
          variant: "default",
        });
      }
    }, 3000);

    try {
      if (item) {
        await updateItemMutation.mutateAsync(data);
      } else {
        await createItemMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update the details for this inventory item."
              : "Fill in the details to add a new item to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter SKU" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>


                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category: Category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            <div className="flex items-center space-x-2">
                              <i className={`${category.icon} text-sm`}></i>
                              <span>{category.name}</span>
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Rate (%)</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select VAT rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {vatRates.map((rate: { value: string; label: string }) => (
                            <SelectItem key={rate.value} value={rate.value}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measurement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="ml">Milliliters</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                        <SelectItem value="cm">Centimeters</SelectItem>
                        <SelectItem value="sets">Sets</SelectItem>
                        <SelectItem value="packs">Packs</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Lab Room A, Shelf 2" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Enter item description (optional)"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* VAT Configuration Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-medium text-charcoal">VAT Configuration</h3>

              <FormField
                control={form.control}
                name="vatIncluded"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Price includes VAT
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Check this if the entered price already includes VAT. Uncheck if the price is VAT-exclusive.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Order History Section */}
            {item && orderHistory && orderHistory.length > 0 && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-history text-university-blue"></i>
                  <h3 className="font-medium text-charcoal">Order History</h3>
                </div>

                <div className="space-y-3">
                  {orderHistory.map((supplierData: SupplierOrderData, idx: number) => (
                    <details key={idx} className="group">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-university-blue transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-building text-medium-gray text-sm"></i>
                              <span className="font-medium text-charcoal">
                                {supplierData.supplier?.name || 'No Supplier'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-medium-gray">
                              <span>
                                <i className="fas fa-box mr-1"></i>
                                {supplierData.orderCount} order{supplierData.orderCount !== 1 ? 's' : ''}
                              </span>
                              <span>
                                <i className="fas fa-cubes mr-1"></i>
                                {supplierData.totalQuantity} units total
                              </span>
                              <span>
                                <i className="fas fa-calendar mr-1"></i>
                                Last: {new Date(supplierData.lastOrderDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <i className="fas fa-chevron-down text-medium-gray group-open:rotate-180 transition-transform"></i>
                        </div>
                      </summary>

                      <div className="mt-2 ml-4 space-y-2">
                        {supplierData.orders?.map((order, orderIdx: number) => (
                          <div key={orderIdx} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-charcoal">
                                Order #{order.orderNumber}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                order.status === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-medium-gray">
                              <div>
                                <span className="font-medium">Date:</span>{' '}
                                {new Date(order.orderDate).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Quantity:</span> {order.quantity}
                              </div>
                              <div>
                                <span className="font-medium">Vendor Ref:</span>{' '}
                                {order.vendorSku || <span className="italic">-</span>}
                              </div>
                              <div>
                                <span className="font-medium">Unit Cost:</span>{' '}
                                £{parseFloat(order.unitCost).toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Total:</span>{' '}
                                £{parseFloat(order.totalCost).toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Received:</span>{' '}
                                {order.received ? (
                                  <span className="text-green-600">
                                    <i className="fas fa-check mr-1"></i>Yes
                                  </span>
                                ) : (
                                  <span className="text-yellow-600">
                                    <i className="fas fa-clock mr-1"></i>Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  createItemMutation.isPending ||
                  updateItemMutation.isPending
                }
                className="bg-university-blue hover:bg-university-dark min-w-[120px]"
              >
                {isSubmitting ||
                createItemMutation.isPending ||
                updateItemMutation.isPending
                  ? "Processing..."
                  : item
                    ? "Update Item"
                    : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
