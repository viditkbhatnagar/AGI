import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface FilterChip {
    id: string;
    label: string;
}

interface FilterChipsProps {
    filters: FilterChip[];
    onRemove: (id: string) => void;
    onClearAll?: () => void;
}

/**
 * Interactive filter chips with remove animations
 * Shows active filters with ability to remove individually or clear all
 */
export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
    const prefersReducedMotion = useReducedMotion();

    if (filters.length === 0) return null;

    const chipVariants = {
        initial: prefersReducedMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.8 },
        animate: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: prefersReducedMotion ? 0.01 : 0.2,
                ease: [0.22, 1, 0.36, 1],
            },
        },
        exit: prefersReducedMotion
            ? { opacity: 0 }
            : {
                opacity: 0,
                scale: 0.8,
                transition: {
                    duration: 0.15,
                    ease: [0.22, 1, 0.36, 1],
                },
            },
    };

    return (
        <div className="flex items-center gap-2 flex-wrap mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Active Filters:
            </span>
            <AnimatePresence mode="popLayout">
                {filters.map((filter) => (
                    <motion.div
                        key={filter.id}
                        variants={chipVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                    >
                        <Badge
                            variant="secondary"
                            className="pl-3 pr-2 py-1.5 flex items-center gap-2 bg-white dark:bg-neutral-800 shadow-sm"
                        >
                            <span className="text-sm">{filter.label}</span>
                            <button
                                onClick={() => onRemove(filter.id)}
                                className="hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full p-0.5 transition-colors"
                                aria-label={`Remove ${filter.label} filter`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    </motion.div>
                ))}
            </AnimatePresence>
            {onClearAll && filters.length > 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="text-xs h-7"
                >
                    Clear all
                </Button>
            )}
        </div>
    );
}
