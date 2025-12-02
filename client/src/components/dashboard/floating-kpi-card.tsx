import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { TinyLineChart } from './tiny-line-chart';

interface FloatingKpiCardProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    delta?: {
        value: number;
        isPositive: boolean;
    };
    subtitle?: string;
    sparklineData?: number[];
    onClick?: () => void;
    animationDelay?: number;
    className?: string;
}

/**
 * Premium floating KPI card with hover effects, sparklines, and click interactions
 * Features:
 * - Floating hover effect with 3D tilt
 * - Click ripple feedback
 * - Mini sparkline chart
 * - Delta indicator with trend
 */
export function FloatingKpiCard({
    icon: Icon,
    label,
    value,
    delta,
    subtitle,
    sparklineData,
    onClick,
    animationDelay = 0,
    className = '',
}: FloatingKpiCardProps) {
    const prefersReducedMotion = useReducedMotion();

    const cardVariants = {
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

    const hoverVariants = prefersReducedMotion
        ? {}
        : {
            scale: 1.02,
            y: -4,
            rotateX: 2,
            rotateY: 2,
            transition: {
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
            },
        };

    const tapVariants = prefersReducedMotion
        ? {}
        : {
            scale: 0.98,
            transition: {
                duration: 0.12,
                ease: [0.22, 1, 0.36, 1],
            },
        };

    return (
        <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover={hoverVariants}
            whileTap={tapVariants}
            style={{ perspective: 1000 }}
            className={className}
        >
            <Card
                className={`relative overflow-hidden bg-white dark:bg-neutral-800 shadow-md hover:shadow-xl transition-shadow duration-300 ${onClick ? 'cursor-pointer' : ''
                    }`}
                onClick={onClick}
            >
                {/* Ripple container */}
                <div className="ripple-container absolute inset-0 overflow-hidden rounded-lg pointer-events-none" />

                <div className="p-6">
                    <div className="flex items-start justify-between">
                        {/* Icon */}
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                            <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>

                        {/* Delta indicator */}
                        {delta && (
                            <div
                                className={`flex items-center gap-1 text-sm font-medium ${delta.isPositive
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                    }`}
                            >
                                <span>{delta.isPositive ? '↑' : '↓'}</span>
                                <span>{Math.abs(delta.value)}%</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {label}
                        </p>
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                            {value}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Sparkline */}
                    {sparklineData && sparklineData.length > 0 && (
                        <div className="mt-4">
                            <TinyLineChart data={sparklineData} />
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}
