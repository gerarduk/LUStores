/**
 * @fileoverview Theme Settings Component
 * 
 * Provides a comprehensive theme/appearance settings panel for users
 * to control dark mode and other visual preferences.
 * 
 * @module client/components/ThemeSettings
 */

import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
        <CardDescription>
          Customize the visual appearance of the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-sm font-medium">Theme Mode</Label>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color theme. System will automatically match your device settings.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium">Light</span>
            </Button>
            
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-6 w-6" />
              <span className="text-sm font-medium">Dark</span>
            </Button>
            
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">System</span>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Current theme:</strong> {theme === "system" ? "System (Auto)" : theme === "dark" ? "Dark" : "Light"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your preference is saved automatically
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
