import { motion } from "framer-motion";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { GlassCard } from "./ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Link } from "wouter";
import "react-calendar/dist/Calendar.css";

interface LiveClass {
  id: string | number;
  title: string;
  startTime: string;
  status?: string;
}

interface CalendarCardProps {
  title?: string;
  liveClasses: LiveClass[];
  animationDelay?: number;
  className?: string;
}

/**
 * CalendarCard - Frosted calendar with event pills
 * Features gradient event indicators and create button
 */
export function CalendarCard({
  title = "Upcoming Classes Calendar",
  liveClasses,
  animationDelay = 0,
  className,
}: CalendarCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Group classes by date
  const classesByDate = liveClasses.reduce((acc, lc) => {
    const dateStr = new Date(lc.startTime).toDateString();
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(lc);
    return acc;
  }, {} as Record<string, LiveClass[]>);

  return (
    <GlassCard animationDelay={animationDelay} className={className} noPadding>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#375BBE] to-[#18E6C9]" />
          <h3 className="text-lg font-semibold text-[#375BBE]">{title}</h3>
        </div>
        <Link href="/admin/live-classes/new">
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#375BBE] to-[#9B5CFF] hover:opacity-90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </Link>
      </div>

      {/* Calendar */}
      <div className="p-4 admin-calendar">
        <Calendar
          className="w-full border-0 bg-transparent"
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const dateStr = date.toDateString();
            const dayClasses = classesByDate[dateStr];

            if (!dayClasses?.length) return null;

            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : 0.1,
                      duration: prefersReducedMotion ? 0 : 0.2,
                    }}
                    className="flex flex-col items-center mt-1 cursor-pointer"
                  >
                    <div className="flex gap-0.5">
                      {dayClasses.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-[#375BBE]"
                        />
                      ))}
                    </div>
                    {dayClasses.length > 3 && (
                      <span className="text-[8px] text-gray-500">
                        +{dayClasses.length - 3}
                      </span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-white border-gray-200 text-[#1a1a2e] max-w-[200px] shadow-lg"
                >
                  <div className="space-y-1">
                    {dayClasses.map((lc) => (
                      <div key={lc.id} className="text-xs">
                        <span className="text-[#375BBE]">
                          {format(new Date(lc.startTime), "h:mm a")}
                        </span>
                        <span className="mx-1">–</span>
                        <span className="text-[#1a1a2e]">{lc.title}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }}
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";
            const dateStr = date.toDateString();
            const hasClasses = classesByDate[dateStr]?.length > 0;
            return hasClasses ? "has-events" : "";
          }}
        />
      </div>

      {/* Legend */}
      <div className="px-6 pb-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#375BBE]" />
          <span>Scheduled class</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#18E6C9]" />
          <span>Today</span>
        </div>
      </div>
    </GlassCard>
  );
}

export default CalendarCard;

