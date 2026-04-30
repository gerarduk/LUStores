import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatsCards from "@/components/StatsCards";
import InventoryTable from "@/components/InventoryTable";
import SidePanel from "@/components/SidePanel";
import ItemModal from "@/components/ItemModal";
import type { ItemWithCategory, Category } from "@shared/schema";

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  totalValueExVAT: number;
  totalUnits: number;
  activeUsers: number;
}

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  categoryName: string;
}

interface CategoryStat {
  categoryName: string;
  itemCount: number;
  totalValue: number;
}

interface ItemsData {
  items: ItemWithCategory[];
  total: number;
}

export default function Dashboard() {
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [showPricesIncVAT, setShowPricesIncVAT] = useState(true);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<LowStockItem[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const { data: categoryStats, isLoading: categoryStatsLoading } = useQuery<CategoryStat[]>({
    queryKey: ["/api/dashboard/category-stats"],
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery<ItemsData>({
    queryKey: ["/api/items", { page: 1, limit: 10 }],
  });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  if (statsLoading || itemsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-xl h-96"></div>
            <div className="bg-card rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleEditItem = (item: ItemWithCategory) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleModalClose = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="p-6">
      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Inventory Activity</h2>
            <button
              onClick={() => setShowPricesIncVAT(!showPricesIncVAT)}
              className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Toggle price display between inc/exc VAT"
            >
              {showPricesIncVAT ? '💷 Inc. VAT' : '💷 Ex. VAT'}
            </button>
          </div>
          <InventoryTable 
            items={itemsData?.items || []}
            total={itemsData?.total || 0}
            showPagination={false}
            title="Recent Inventory Activity"
            onEditItem={handleEditItem}
            showPricesIncVAT={showPricesIncVAT}
          />
        </div>
        
        <SidePanel 
          lowStockItems={Array.isArray(lowStockItems) ? lowStockItems as unknown as ItemWithCategory[] : []}
          categoryStats={Array.isArray(categoryStats) ? categoryStats as unknown as Array<{
            category: { id: number; name: string; description: string | null; icon: string; color: string; createdAt: Date | null; updatedAt: Date | null; };
            itemCount: number;
            totalValue: number;
          }> : []}
          isLoading={lowStockLoading || categoryStatsLoading}
        />
      </div>

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={handleModalClose}
        item={editingItem}
        categories={categoriesData || []}
      />
    </div>
  );
}
