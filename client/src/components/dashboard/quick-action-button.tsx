import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useRippleEffect } from '@/hooks/use-ripple-effect';

interface QuickActionButtonProps {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
    className?: string;
}

/**
 * Enhanced action button with ripple effect and hover animations
 * Used for quick actions in the dashboard
 */
export function QuickActionButton({
    icon: Icon,
    label,
    onClick,
    variant = 'outline',
    className = '',
}: QuickActionButtonProps) {
    const prefersReducedMotion = useReducedMotion();
    const { createRipple } = useRippleEffect();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        createRipple(e);
        onClick();
    };

    const hoverVariants = prefersReducedMotion
        ? {}
        : {
            scale: 1.02,
            y: -2,
            transition: {
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1],
            },
        };

    const tapVariants = prefersReducedMotion
        ? {}
        : {
            scale: 0.98,
            transition: {
                duration: 0.12,
            },
        };

    return (
        <motion.div
            whileHover={hoverVariants}
            whileTap={tapVariants}
            className="relative"
        >
            <Button
                variant={variant}
                className={`w-full justify-start relative overflow-hidden ${className}`}
                onClick={handleClick}
            >
                <div className="ripple-container absolute inset-0" />
                <Icon className="mr-2 h-4 w-4" />
                <span>{label}</span>
            </Button>
        </motion.div>
    );
}

/* Add ripple effect styles to global CSS */
