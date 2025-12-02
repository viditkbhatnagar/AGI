import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

/**
 * Animated counter with smooth roll-up effect
 * Perfect for KPI values and statistics
 */
export function AnimatedCounter({
    value,
    duration = 2,
    decimals = 0,
    prefix = '',
    suffix = '',
    className = '',
}: AnimatedCounterProps) {
    const spring = useSpring(0, { duration: duration * 1000 });
    const display = useTransform(spring, (current) =>
        prefix + current.toFixed(decimals) + suffix
    );

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span className={className}>{display}</motion.span>;
}
