import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to readable format
export function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format time to readable format
export function formatTime(date: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Format date and time to readable format
export function formatDateTime(date: Date | string): string {
  if (!date) return "";
  return `${formatDate(date)} at ${formatTime(date)}`;
}

// Format seconds to hours and minutes
export function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

// Calculate progress percentage
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Generate initials from name
export function getInitials(name: string): string {
  if (!name) return "";
  
  const names = name.split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  
  return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}

// Calculate days remaining
export function getDaysRemaining(endDate: Date | string): number {
  const end = new Date(endDate);
  const today = new Date();
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

// Format as months/days/years
export function formatTimeRemaining(endDate: Date | string): string {
  const days = getDaysRemaining(endDate);
  
  if (days < 30) {
    return `${days} days`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    
    if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
}

// Format course type for display
export function formatCourseType(type: string): string {
  if (type === 'standalone') return 'Standalone';
  if (type === 'with-mba') return 'With MBA';
  return type;
}

// Get path name for navigation highlight
export function getActivePathName(pathname: string): string {
  if (!pathname) return '/';
  
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  
  if (parts.length >= 2 && parts[1] !== 'courses') {
    return `/${parts[0]}/${parts[1]}`;
  }
  
  return `/${parts[0]}`;
}
