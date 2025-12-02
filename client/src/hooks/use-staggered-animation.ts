import { useReducedMotion } from './use-reduced-motion';

/**
 * Custom hook for staggered animations on dashboard cards
 * Returns Framer Motion animation variants with stagger delay
 */
export function useStaggeredAnimation(index: number) {
    const prefersReducedMotion = useReducedMotion();

    const baseDelay = 0.08; // 80ms between each card
    const delay = prefersReducedMotion ? 0 : index * baseDelay;

    return {
        initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: prefersReducedMotion ? 0.01 : 0.32,
                delay,
                ease: [0.22, 1, 0.36, 1], // Premium easing
            }
        },
    };
}
