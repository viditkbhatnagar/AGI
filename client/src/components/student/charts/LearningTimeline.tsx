// Learning Timeline - Enhanced with animations, progress indicators, and visual hierarchy
import React from 'react';
import { PlayCircle, FileText, HelpCircle, Award, Video, BookOpen, Clock, CheckCircle2, Circle } from 'lucide-react';

interface TimelineItem {
  id: string;
  type: 'video' | 'document' | 'quiz' | 'achievement' | 'lesson';
  title: string;
  time: string;
  duration?: string;
  status?: 'completed' | 'in_progress';
}

interface LearningTimelineProps {
  items: TimelineItem[];
}

const iconMap = {
  video: Video,
  document: FileText,
  quiz: HelpCircle,
  achievement: Award,
  lesson: BookOpen
};

const colorMap = {
  video: { 
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', 
    icon: 'text-blue-500', 
    border: 'border-blue-200',
    glow: 'shadow-blue-100'
  },
  document: { 
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', 
    icon: 'text-emerald-500', 
    border: 'border-emerald-200',
    glow: 'shadow-emerald-100'
  },
  quiz: { 
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50', 
    icon: 'text-amber-500', 
    border: 'border-amber-200',
    glow: 'shadow-amber-100'
  },
  achievement: { 
    bg: 'bg-gradient-to-br from-purple-50 to-violet-50', 
    icon: 'text-purple-500', 
    border: 'border-purple-200',
    glow: 'shadow-purple-100'
  },
  lesson: { 
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50', 
    icon: 'text-rose-500', 
    border: 'border-rose-200',
    glow: 'shadow-rose-100'
  }
};

export default function LearningTimeline({ items }: LearningTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <div className="relative">
          <Clock className="size-12 mb-3 opacity-30" />
          <div className="absolute inset-0 size-12 bg-slate-200 rounded-full blur-xl opacity-50" />
        </div>
        <p className="text-sm font-medium">No recent activity</p>
        <p className="text-xs text-slate-300 mt-1">Start learning to see your progress!</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 rounded-full" />
      
      <div className="space-y-3">
        {items.map((item, index) => {
          const Icon = iconMap[item.type] || BookOpen;
          const colors = colorMap[item.type] || colorMap.lesson;
          const isFirst = index === 0;
          const isCompleted = item.status === 'completed';
          
          return (
            <div
              key={item.id}
              className={`
                relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 
                hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer
                ${colors.bg} ${colors.border} ${colors.glow}
                ${isFirst ? 'shadow-md' : 'shadow-sm'}
              `}
              style={{
                animation: `slideIn 0.4s ease-out ${index * 0.08}s both`
              }}
            >
              {/* Timeline dot */}
              <div className="absolute -left-[5px] top-4 z-10">
                {isCompleted ? (
                  <div className="size-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
                ) : (
                  <div className="size-3 rounded-full bg-white border-2 border-slate-300 shadow-sm" />
                )}
              </div>
              
              {/* Icon container with glow */}
              <div className={`relative flex-shrink-0 size-10 rounded-xl flex items-center justify-center bg-white/80 border ${colors.border} shadow-sm`}>
                <Icon className={`size-5 ${colors.icon}`} />
                {isFirst && (
                  <div className={`absolute inset-0 rounded-xl ${colors.icon.replace('text-', 'bg-')} opacity-20 blur-lg animate-pulse`} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700 line-clamp-2 leading-tight">
                    {item.title}
                  </p>
                  {isCompleted && (
                    <CheckCircle2 className="size-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="size-3" />
                    {item.time}
                  </span>
                  {item.duration && (
                    <>
                      <span className="size-1 rounded-full bg-slate-300" />
                      <span className="text-xs text-slate-500 font-medium">{item.duration}</span>
                    </>
                  )}
                </div>
                
                {/* Type badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.icon.replace('text-', 'bg-')}/10 ${colors.icon}`}>
                    {item.type}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
