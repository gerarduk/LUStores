import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  onExport: (format: 'csv' | 'json') => void | Promise<void>;
  formats?: Array<'csv' | 'json'>;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

export default function ExportButton({ 
  onExport, 
  formats = ['csv', 'json'],
  label = 'Export',
  variant = 'outline'
}: ExportButtonProps) {
  // If only one format, show simple button
  if (formats.length === 1) {
    return (
      <Button
        onClick={() => onExport(formats[0])}
        variant={variant}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {label} {formats[0].toUpperCase()}
      </Button>
    );
  }

  // Multiple formats: show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} className="gap-2">
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.includes('csv') && (
          <DropdownMenuItem onClick={() => onExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {formats.includes('json') && (
          <DropdownMenuItem onClick={() => onExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
