import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logout } from "@/utils/auth";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'superuser' | 'admin';
  profileImageUrl?: string;
  isActive: boolean;
}

export default function Sidebar() {
  const location = useLocation();
  const { user: authUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Cast user to our interface
  const user = authUser as User | null;

  // Fetch per-role page visibility config set by admins in Settings
  const { data: allowedPages } = useQuery<string[] | undefined>({
    queryKey: ['/api/settings/page-visibility', user?.role],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/settings/pages.visible_to_${user!.role}`);
        const data = await response.json();
        return data.value && Array.isArray(data.value) ? (data.value as string[]) : undefined;
      } catch {
        return undefined;
      }
    },
    enabled: !!user?.role,
    staleTime: 60_000, // Cache for 1 minute — admins don't change this often
  });

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isLoggingOut) return; // Prevent double-clicking
    
    setIsLoggingOut(true);
    console.log('🔓 Logout button clicked');
    
    try {
      await logout();
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still redirect on error since token is cleared
      window.location.replace('/login?t=' + Date.now());
    }
  };

  // minRole: 'superuser' = visible to superuser + admin; 'admin' = admin only; absent = all users
  const navItems = [
    { path: "/", label: "Dashboard", icon: "fas fa-chart-line" },
    { path: "/inventory", label: "Inventory", icon: "fas fa-boxes" },
    { path: "/sales", label: "Sales & Quotes", icon: "fas fa-shopping-cart" },
    { path: "/orders", label: "Orders", icon: "fas fa-truck" },
    { path: "/notes", label: "Notes", icon: "fas fa-sticky-note" },
    { path: "/vendors", label: "Vendors", icon: "fas fa-building" },
    { path: "/reports", label: "Reports", icon: "fas fa-chart-bar", minRole: "superuser" as const },
    { path: "/analytics", label: "Sales Analytics", icon: "fas fa-chart-pie", minRole: "superuser" as const },
    { path: "/categories", label: "Categories", icon: "fas fa-tags", minRole: "admin" as const },
    { path: "/users", label: "User Management", icon: "fas fa-users", minRole: "admin" as const },
    { path: "/chargecodes", label: "Charge Codes", icon: "fas fa-credit-card", minRole: "admin" as const },
    { path: "/backups", label: "Database Backups", icon: "fas fa-database", minRole: "admin" as const },
    { path: "/system", label: "System Management", icon: "fas fa-cogs", minRole: "admin" as const },
    { path: "/settings", label: "Settings", icon: "fas fa-sliders-h", minRole: "admin" as const },
    { path: "/documentation", label: "Documentation", icon: "fas fa-book" },
  ];

  return (
    <TooltipProvider>
      <aside className="w-64 bg-card shadow-lg border-r border-border flex flex-col">
      {/* University Logo and Title */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-university-blue rounded-lg flex items-center justify-center">
            <i className="fas fa-university text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-charcoal">Inventory System</h1>
            <p className="text-sm text-medium-gray">University Database</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            if (item.minRole === 'admin' && user?.role !== 'admin') return null;
            if (item.minRole === 'superuser' && user?.role !== 'admin' && user?.role !== 'superuser') return null;
            // If admin has configured page visibility for this role, apply it
            const pageName = item.path === '/' ? 'dashboard' : item.path.replace('/', '');
            if (allowedPages && !allowedPages.includes(pageName)) return null;

            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <div
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "bg-university-blue text-white font-medium"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <i className={`${item.icon} w-5`}></i>
                    <span>{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || user?.email} />
            <AvatarFallback>
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </p>
            <p className="text-xs text-medium-gray capitalize">{user?.role}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-medium-gray hover:text-charcoal"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <i className={isLoggingOut ? "fas fa-spinner fa-spin" : "fas fa-sign-out-alt"}></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLoggingOut ? "Signing out..." : "Logout"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
    </TooltipProvider>
  );
}
