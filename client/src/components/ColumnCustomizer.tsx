/**
 * @fileoverview Column Customization Component
 * 
 * Provides a reusable interface for customizing table columns.
 * Features:
 * - Show/hide columns
 * - Reorder columns via drag and drop
 * - Save preferences to localStorage
 * - Reset to defaults
 * 
 * @module client/components/ColumnCustomizer
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2, RotateCcw } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Required columns cannot be hidden
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey: string; // Key for localStorage
  label?: string;
}

function SortableColumn({ column, onToggle }: { column: ColumnConfig; onToggle: (id: string, visible: boolean) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-2 p-2 border rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <Checkbox
        id={`column-${column.id}`}
        checked={column.visible}
        onCheckedChange={(checked) => onToggle(column.id, checked as boolean)}
        disabled={column.required}
      />
      <Label
        htmlFor={`column-${column.id}`}
        className={`flex-1 cursor-pointer ${column.required ? 'text-gray-500 italic' : ''}`}
      >
        {column.label} {column.required && "(Required)"}
      </Label>
    </div>
  );
}

export default function ColumnCustomizer({
  columns,
  onChange,
  storageKey,
  label = "Customize Columns"
}: ColumnCustomizerProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedColumns = JSON.parse(saved) as ColumnConfig[];
        // Merge saved preferences with current columns (in case new columns were added)
        const merged = columns.map(col => {
          const savedCol = savedColumns.find(sc => sc.id === col.id);
          return savedCol ? { ...col, visible: savedCol.visible } : col;
        });
        // Reorder based on saved order
        const reordered = savedColumns
          .filter(sc => merged.find(m => m.id === sc.id))
          .map(sc => merged.find(m => m.id === sc.id)!)
          .concat(merged.filter(m => !savedColumns.find(sc => sc.id === m.id)));
        setLocalColumns(reordered);
        onChange(reordered);
      } catch (e) {
        console.error('Failed to parse saved column preferences:', e);
      }
    }
  }, [storageKey]);

  const handleToggle = (id: string, visible: boolean) => {
    const updated = localColumns.map(col =>
      col.id === id ? { ...col, visible } : col
    );
    setLocalColumns(updated);
    onChange(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localColumns.findIndex(col => col.id === active.id);
      const newIndex = localColumns.findIndex(col => col.id === over.id);
      const reordered = arrayMove(localColumns, oldIndex, newIndex);
      setLocalColumns(reordered);
      onChange(reordered);
      localStorage.setItem(storageKey, JSON.stringify(reordered));
    }
  };

  const handleReset = () => {
    setLocalColumns(columns);
    onChange(columns);
    localStorage.removeItem(storageKey);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Column Settings</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 text-xs"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Drag to reorder, check to show/hide columns
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localColumns.map(col => col.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {localColumns.map(column => (
                  <SortableColumn
                    key={column.id}
                    column={column}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  );
}
