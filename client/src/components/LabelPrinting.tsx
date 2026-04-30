import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, QrCode as QrCodeIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface LabelData {
  id: number;
  name: string;
  sku: string;
  location: string;
  description: string;
  qrCodeDataUrl: string;
}

interface Item {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  categoryId: number;
  location: string | null;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface LabelCardProps {
  label: LabelData;
}

function LabelCard({ label }: LabelCardProps) {
  return (
    <div className="label-card border rounded-sm p-2 bg-white">
      <div className="font-bold text-xs mb-1 line-clamp-2">{label.name}</div>
      <div className="flex items-start gap-2">
        <img
          src={label.qrCodeDataUrl}
          alt={`QR for ${label.sku}`}
          className="w-12 h-12 flex-shrink-0"
        />
        <div className="flex-1 min-w-0 text-xs">
          <div className="font-mono">SKU: {label.sku}</div>
          <div className="text-gray-600">Loc: {label.location}</div>
        </div>
      </div>
      {label.description && (
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
          {label.description}
        </div>
      )}
    </div>
  );
}

interface LabelPrintingProps {
  // Add props if needed
}

export default function LabelPrinting({}: LabelPrintingProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [generatedLabels, setGeneratedLabels] = useState<LabelData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  // Fetch items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/items', { page: 1, limit: 1000 }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/items?page=1&limit=1000');
      return response.json();
    }
  });

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response.json();
    }
  });

  const items = itemsData?.items || [];
  const categories = categoriesData || [];

  // Extract unique locations
  const uniqueLocations = useMemo(() => {
    if (!items.length) return [];
    const locations = items
      .map((item: Item) => item.location)
      .filter((loc): loc is string => Boolean(loc));
    return Array.from(new Set(locations)).sort();
  }, [items]);

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    if (!items.length) return [];

    return items.filter((item: Item) => {
      if (selectedCategory !== 'all' && item.categoryId.toString() !== selectedCategory) return false;
      if (selectedLocation !== 'all' && item.location !== selectedLocation) return false;
      if (activeFilter === 'active' && !item.isActive) return false;
      if (activeFilter === 'inactive' && item.isActive) return false;
      return true;
    });
  }, [items, selectedCategory, selectedLocation, activeFilter]);

  // Generate labels with QR codes
  const generateLabels = async () => {
    if (filteredItems.length === 0) {
      toast({
        title: "No items to print",
        description: "Please adjust your filters to select items",
        variant: "destructive",
      });
      return;
    }

    // Limit the number of labels to prevent browser hanging
    const MAX_LABELS = 100;
    if (filteredItems.length > MAX_LABELS) {
      toast({
        title: "Too many items selected",
        description: `Please select ${MAX_LABELS} items or fewer. You have ${filteredItems.length} items selected.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedLabels([]);
    setGenerationProgress(0);

    try {
      // Process QR codes in batches to prevent browser hanging
      const BATCH_SIZE = 10;
      const labels: LabelData[] = [];

      for (let i = 0; i < filteredItems.length; i += BATCH_SIZE) {
        const batch = filteredItems.slice(i, i + BATCH_SIZE);
        
        const batchLabels = await Promise.all(
          batch.map(async (item: Item) => {
            try {
              const qrCodeDataUrl = await QRCode.toDataURL(item.sku, {
                width: 120,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
              });

              return {
                id: item.id,
                name: item.name,
                sku: item.sku,
                location: item.location || 'N/A',
                description: item.description || '',
                qrCodeDataUrl
              };
            } catch (error) {
              console.error(`Failed to generate QR for ${item.sku}:`, error);
              // Return null for failed items, we'll filter them out
              return null;
            }
          })
        );

        // Filter out failed QR generations and add to results
        const validBatchLabels = batchLabels.filter((label): label is LabelData => label !== null);
        labels.push(...validBatchLabels);
        
        // Update progress
        const progress = Math.round(((i + batch.length) / filteredItems.length) * 100);
        setGenerationProgress(progress);
        
        // Update partial results for large batches
        if (filteredItems.length > BATCH_SIZE) {
          setGeneratedLabels([...labels]);
        }
      }

      // Filter out any failed QR generations
      const validLabels = labels.filter((label): label is LabelData => label !== null);

      if (validLabels.length === 0) {
        toast({
          title: "Generation Failed",
          description: "Failed to generate any QR codes",
          variant: "destructive",
        });
        return;
      }

      if (validLabels.length < filteredItems.length) {
        toast({
          title: "Partial Success",
          description: `Generated ${validLabels.length} of ${filteredItems.length} labels. Some QR codes failed.`,
        });
      } else {
        toast({
          title: "Labels Generated",
          description: `${validLabels.length} labels ready to print`,
        });
      }

      setGeneratedLabels(validLabels);
    } catch (error) {
      console.error('Error generating labels:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate QR codes",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedLocation('all');
    setActiveFilter('active');
    setGeneratedLabels([]);
  };

  if (itemsLoading || categoriesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print, .sidebar, .topbar, header, nav, button {
            display: none !important;
          }

          body {
            background: white;
            margin: 0;
            padding: 0;
          }

          .label-grid {
            display: grid;
            grid-template-columns: repeat(3, 70mm);
            gap: 0;
            padding: 5mm;
          }

          .label-card {
            width: 70mm;
            height: 40mm;
            border: 1px solid #ddd;
            padding: 3mm;
            page-break-inside: avoid;
            box-sizing: border-box;
            background: white;
          }

          .label-card img {
            width: 30mm;
            height: 30mm;
          }

          @page {
            size: A4;
            margin: 5mm;
          }
        }

        /* Screen preview styles */
        .label-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
      `}</style>

      {/* Filter Section */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            Label Printing
          </CardTitle>
          <CardDescription>
            Generate and print labels with QR codes for inventory items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: Category) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((location: string) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Status Filter */}
          <div>
            <Label>Status</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="all"
                  checked={activeFilter === 'all'}
                  onChange={() => setActiveFilter('all')}
                  className="cursor-pointer"
                />
                All
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={activeFilter === 'active'}
                  onChange={() => setActiveFilter('active')}
                  className="cursor-pointer"
                />
                Active Only
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={activeFilter === 'inactive'}
                  onChange={() => setActiveFilter('inactive')}
                  className="cursor-pointer"
                />
                Inactive Only
              </label>
            </div>
          </div>

          {/* Info Badge */}
          <div className="flex flex-col gap-2">
            <Badge variant="secondary">
              {filteredItems.length} items match your filters
            </Badge>
            {filteredItems.length > 100 && (
              <Badge variant="destructive">
                ⚠️ Too many items - limit to 100 for best performance
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={generateLabels}
              disabled={isGenerating || filteredItems.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCodeIcon className="mr-2 h-4 w-4" />
                  Generate Labels
                </>
              )}
            </Button>

            {isGenerating && generationProgress > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <span>{generationProgress}%</span>
              </div>
            )}

            <Button
              onClick={handlePrint}
              disabled={generatedLabels.length === 0}
              variant="outline"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Labels
            </Button>

            <Button
              onClick={handleClearFilters}
              variant="ghost"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {generatedLabels.length > 0 && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle>Preview ({generatedLabels.length} labels)</CardTitle>
            <CardDescription>
              Review before printing. Labels will print 3 per row on A4 paper.
              {generatedLabels.length > 50 && (
                <span className="text-amber-600 block mt-1">
                  ⚠️ Large number of labels - preview may be slow. Consider printing in smaller batches.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="label-grid">
                {generatedLabels.slice(0, 100).map(label => (
                  <LabelCard key={label.id} label={label} />
                ))}
                {generatedLabels.length > 100 && (
                  <div className="col-span-full text-center py-4 text-muted-foreground">
                    ... and {generatedLabels.length - 100} more labels
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Print-only Section */}
      {generatedLabels.length > 0 && (
        <div className="print-only" style={{ display: 'none' }}>
          <div className="label-grid">
            {generatedLabels.map(label => (
              <LabelCard key={label.id} label={label} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
