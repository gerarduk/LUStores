import { Badge } from "@/components/ui/badge";

export type StatusType = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-green-100 text-green-800 hover:bg-green-100",
  warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  danger: "bg-red-100 text-red-800 hover:bg-red-100",
  info: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  neutral: "bg-gray-100 text-gray-800 hover:bg-gray-100"
};

export default function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  return (
    <Badge className={`${statusStyles[status]} ${className}`}>
      {label}
    </Badge>
  );
}
