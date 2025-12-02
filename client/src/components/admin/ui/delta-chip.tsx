import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaChipProps {
  value: number;
  isPositive?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

/**
 * DeltaChip - Trend indicator chip with up/down/neutral states
 */
export function DeltaChip({
  value,
  isPositive,
  size = "md",
  showIcon = true,
  className,
}: DeltaChipProps) {
  const isNeutral = value === 0;
  const positive = isPositive ?? value > 0;

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2 py-1 text-xs gap-1",
    lg: "px-3 py-1.5 text-sm gap-1.5",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-colors",
        sizeStyles[size],
        isNeutral
          ? "bg-admin-muted/10 text-admin-muted"
          : positive
          ? "bg-admin-success/10 text-admin-success"
          : "bg-admin-danger/10 text-admin-danger",
        className
      )}
    >
      {showIcon &&
        (isNeutral ? (
          <Minus className={iconSizes[size]} />
        ) : positive ? (
          <TrendingUp className={iconSizes[size]} />
        ) : (
          <TrendingDown className={iconSizes[size]} />
        ))}
      <span>{positive && !isNeutral ? "+" : ""}{value}%</span>
    </div>
  );
}

export default DeltaChip;

