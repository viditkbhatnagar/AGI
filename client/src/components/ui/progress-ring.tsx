import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  valueClassName?: string;
  pathClassName?: string;
  trackClassName?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  valueClassName,
  pathClassName,
  trackClassName,
  children,
}: ProgressRingProps) {
  const radius = size / 2 - strokeWidth / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = value / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className={cn("stroke-gray-200", trackClassName)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
        />
        <circle
          className={cn("stroke-primary transition-all duration-300 ease-in-out", pathClassName)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : (
        <div className={cn("absolute inset-0 flex items-center justify-center", valueClassName)}>
          <span className="text-2xl font-bold">{Math.round(value)}%</span>
        </div>
      )}
    </div>
  );
}
