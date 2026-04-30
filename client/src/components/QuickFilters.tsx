/**
 * @fileoverview Quick Filters Component
 * 
 * Provides reusable quick filter buttons for common filtering needs.
 * Features:
 * - Pre-defined filter presets
 * - Active filter indication
 * - Clear all filters
 * - Custom filter support
 * 
 * @module client/components/QuickFilters
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface FilterPreset {
  id: string;
  label: string;
  value?: unknown;
  icon?: string | React.ReactNode;
  description?: string;
}

interface QuickFiltersProps {
  presets: FilterPreset[];
  activeFilters: string[];
  onChange: (filterIds: string[]) => void;
  label?: string;
  className?: string;
}

export default function QuickFilters({
  presets,
  activeFilters,
  onChange,
  label = "Quick Filters",
  className = ""
}: QuickFiltersProps) {
  const hasActiveFilters = activeFilters.length > 0;

  const handleFilterToggle = (filterId: string) => {
    const newFilters = activeFilters.includes(filterId)
      ? activeFilters.filter(id => id !== filterId)
      : [...activeFilters, filterId];
    onChange(newFilters);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = activeFilters.includes(preset.id);
          return (
            <Badge
              key={preset.id}
              variant={isActive ? "default" : "outline"}
              className={`cursor-pointer transition-all hover:scale-105 ${
                isActive
                  ? "bg-university-blue text-white hover:bg-university-dark"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleFilterToggle(preset.id)}
              title={preset.description}
            >
              {preset.icon && (
                <span className="mr-1.5">
                  {typeof preset.icon === 'string' ? (
                    <i className={`fas fa-${preset.icon}`} />
                  ) : (
                    preset.icon
                  )}
                </span>
              )}
              {preset.label}
            </Badge>
          );
        })}
      </div>
      {hasActiveFilters && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
        </div>
      )}
    </div>
  );
}
