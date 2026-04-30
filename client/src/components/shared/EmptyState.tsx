import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="p-8 text-center">
        {icon && (
          <div className="flex justify-center mb-4 text-medium-gray">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-charcoal mb-2">{title}</h3>
        {description && (
          <p className="text-medium-gray mb-4">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} className="bg-university-blue hover:bg-university-dark">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
