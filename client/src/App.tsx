import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Sales from "@/pages/Sales";
import Orders from "@/pages/Orders";
import Notes from "@/pages/Notes";
import Categories from "@/pages/Categories";
import Vendors from "@/pages/Vendors";
import Users from "@/pages/Users";
import Reports from "@/pages/Reports";
import SalesAnalytics from "@/pages/SalesAnalytics";
import ChargeCodes from "@/pages/ChargeCodes";
import Backups from "@/pages/Backups";
import SystemManagement from "@/pages/SystemManagement";
import Documentation from "@/pages/Documentation";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

type MinRole = 'superuser' | 'admin';

function ProtectedRoute({
  path,
  component: Component,
  minRole,
}: {
  path: string;
  component: React.ComponentType;
  minRole: MinRole;
}) {
  const { user } = useAuth() as { user: { role: string } | null };
  const hasAccess = user
    ? minRole === 'admin'
      ? user.role === 'admin'
      : user.role === 'superuser' || user.role === 'admin'
    : false;

  return (
    <Route path={path}>
      {hasAccess ? <Component /> : <Redirect to="/" />}
    </Route>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-university-blue"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/landing" component={Landing} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/sales" component={Sales} />
            <Route path="/orders" component={Orders} />
            <Route path="/notes" component={Notes} />
            <ProtectedRoute path="/categories" component={Categories} minRole="admin" />
            <Route path="/vendors" component={Vendors} />
            <ProtectedRoute path="/users" component={Users} minRole="admin" />
            <ProtectedRoute path="/reports" component={Reports} minRole="superuser" />
            <ProtectedRoute path="/analytics" component={SalesAnalytics} minRole="superuser" />
            <ProtectedRoute path="/chargecodes" component={ChargeCodes} minRole="admin" />
            <ProtectedRoute path="/backups" component={Backups} minRole="admin" />
            <ProtectedRoute path="/system" component={SystemManagement} minRole="admin" />
            <ProtectedRoute path="/settings" component={Settings} minRole="admin" />
            <Route path="/documentation" component={Documentation} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
