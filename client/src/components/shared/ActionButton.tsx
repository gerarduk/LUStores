import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ActionButtonProps {
  onClick: () => void;
  icon?: LucideIcon;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function ActionButton({
  onClick,
  icon: Icon,
  children,
  variant = "primary",
  size = "default",
  disabled = false,
  className = "",
  type = "button"
}: ActionButtonProps) {
  const variantClasses = {
    primary: "bg-university-blue hover:bg-university-dark text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-charcoal",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    outline: "border-university-blue text-university-blue hover:bg-university-blue hover:text-white"
  };

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      size={size}
      variant={variant === "outline" ? "outline" : "default"}
      className={`${variant !== "outline" ? variantClasses[variant] : variantClasses.outline} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4 mr-2" />}
      {children}
    </Button>
  );
}
