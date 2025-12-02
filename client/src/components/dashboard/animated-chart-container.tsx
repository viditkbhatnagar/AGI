import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ReactNode } from 'react';

interface AnimatedChartContainerProps {
    title: string;
    badge?: string;
    children: ReactNode;
    animationDelay?: number;
    className?: string;
}

/**
 * Animated container for charts with staggered entry animation
 * Features elevation on hover and smooth transitions
 */
export function AnimatedChartContainer({
    title,
    badge,
    children,
    animationDelay = 0,
    className = '',
}: AnimatedChartContainerProps) {
    const prefersReducedMotion = useReducedMotion();

    const containerVariants = {
        initial: prefersReducedMotion
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: prefersReducedMotion ? 0.01 : 0.32,
                delay: animationDelay,
                ease: [0.22, 1, 0.36, 1],
            },
        },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className={className}
        >
            <div className="group relative h-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                {/* Premium gradient glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            {/* Decorative pill */}
                            <div className="h-6 w-1 rounded-full bg-primary-500" />
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">
                                {title}
                            </h3>
                        </div>
                        {badge && (
                            <span className="px-3 py-1 text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full border border-primary-100 dark:border-primary-800">
                                {badge}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 min-h-0 relative">
                        {children}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
