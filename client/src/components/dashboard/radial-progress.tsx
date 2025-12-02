import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface RadialProgressProps {
    percentage: number;
    label: string;
    color: string;
    glowColor?: string;
    size?: number;
    strokeWidth?: number;
    count?: number;
    animated?: boolean;
}

/**
 * AI-themed radial progress indicator with neural glow effect
 * Perfect for displaying completion percentages
 */
export function RadialProgress({
    percentage,
    label,
    color,
    glowColor,
    size = 120,
    strokeWidth = 12,
    count,
    animated = true,
}: RadialProgressProps) {
    const prefersReducedMotion = useReducedMotion();
    const [displayPercentage, setDisplayPercentage] = useState(0);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (displayPercentage / 100) * circumference;

    useEffect(() => {
        if (!animated || prefersReducedMotion) {
            setDisplayPercentage(percentage);
            return;
        }

        const duration = 1500;
        const steps = 60;
        const increment = percentage / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= percentage) {
                setDisplayPercentage(percentage);
                clearInterval(timer);
            } else {
                setDisplayPercentage(current);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [percentage, animated, prefersReducedMotion]);

    return (
        <motion.div
            className="relative inline-flex items-center justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
                duration: prefersReducedMotion ? 0.01 : 0.8,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            <svg width={size} height={size} className="transform -rotate-90">
                <defs>
                    {/* Gradient for the progress */}
                    <linearGradient id={`gradient-${label.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor={glowColor || color} stopOpacity={0.7} />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id={`glow-${label.replace(/\s+/g, '-')}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--color-neutral-200))"
                    strokeWidth={strokeWidth}
                    opacity={0.2}
                />

                {/* Progress circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={`url(#gradient-${label.replace(/\s+/g, '-')})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    filter={`url(#glow-${label.replace(/\s+/g, '-')})`}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{
                        duration: prefersReducedMotion ? 0.01 : 1.5,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                />

                {/* Pulsing glow */}
                {!prefersReducedMotion && (
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius + 4}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        opacity={0}
                        animate={{
                            opacity: [0, 0.3, 0],
                            r: [radius + 4, radius + 8, radius + 4],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                )}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-2xl font-bold"
                    style={{ color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {Math.round(displayPercentage)}%
                </motion.span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    {label.split(' ')[0]}
                </span>
                {count !== undefined && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-500">
                        ({count})
                    </span>
                )}
            </div>
        </motion.div>
    );
}
