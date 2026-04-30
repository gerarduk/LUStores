import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  
  const handleLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-university-blue to-university-dark flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <i className="fas fa-university text-university-blue text-3xl"></i>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            University Inventory
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Professional pricing and stock database management system
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-boxes text-2xl"></i>
              </div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription className="text-blue-100">
                Comprehensive tracking of all university assets and supplies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-users text-2xl"></i>
              </div>
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription className="text-blue-100">
                Secure multi-user system with admin, manager, and user roles
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-2xl"></i>
              </div>
              <CardTitle>Reporting & Analytics</CardTitle>
              <CardDescription className="text-blue-100">
                Real-time insights and comprehensive reporting capabilities
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-white shadow-xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-semibold text-charcoal mb-4">
              Ready to get started?
            </h2>
            <p className="text-medium-gray mb-6">
              Sign in with your university credentials to access the inventory management system.
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-university-blue hover:bg-university-dark text-white px-8 py-3 text-lg"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-blue-100">
          <p className="text-sm">
            Secure authentication powered by university systems
          </p>
        </div>
      </div>
    </div>
  );
}
