interface StatsCardsProps {
  stats?: {
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
    totalValueExVAT: number;
    totalUnits: number;
    activeUsers: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  // Function to generate a dynamic date-based caption
  const getFormattedDate = () => {
    const today = new Date();
    return today.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const cards = [
    {
      title: "Total Items",
      value: stats?.totalItems?.toLocaleString() || "0",
      icon: "fas fa-boxes",
      iconBg: "bg-blue-100",
      iconColor: "text-university-blue",
      change: `Updated ${getFormattedDate()}`,
      changeType: "neutral",
    },
    {
      title: "Low Stock Items",
      value: stats?.lowStockItems?.toString() || "0",
      icon: "fas fa-exclamation-triangle",
      iconBg: "bg-orange-100",
      iconColor: "text-warning",
      change: (stats?.lowStockItems ?? 0) > 0 ? `${stats?.lowStockItems} items need attention` : "All items in stock",
      changeType: (stats?.lowStockItems ?? 0) > 0 ? "warning" : "positive",
    },
    {
      title: "Total Value",
      value: `£${(stats?.totalValue || 0).toLocaleString()}`,
      icon: "fas fa-pound-sign",
      iconBg: "bg-green-100",
      iconColor: "text-success",
      change: `Inc VAT: £${(stats?.totalValue || 0).toLocaleString()} | Ex VAT: £${(stats?.totalValueExVAT || 0).toLocaleString()}`,
      changeType: "neutral",
    },
    {
      title: "Total Inventory Units",
      value: stats?.totalUnits?.toLocaleString() || "0",
      icon: "fas fa-cubes",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      change: `Total quantity in stock`,
      changeType: "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-medium-gray">{card.title}</p>
              <p className="text-3xl font-bold text-charcoal">{card.value}</p>
              <p className={`text-sm mt-1 flex items-center ${
                card.changeType === "positive" ? "text-success" : 
                card.changeType === "warning" ? "text-warning" : "text-medium-gray"
              }`}>
                <i className={`fas ${
                  card.changeType === "positive" ? "fa-arrow-up" : 
                  card.changeType === "warning" ? "fa-exclamation-triangle" : "fa-minus"
                } mr-1`}></i>
                {card.change}
              </p>
            </div>
            <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
              <i className={`${card.icon} ${card.iconColor} text-xl`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
