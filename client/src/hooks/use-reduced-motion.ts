import { useEffect, useState } from 'react';

/**
 * Custom hook to detect if user prefers reduced motion
 * Returns true if user has enabled "reduce motion" in their OS settings
 */
export function useReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Set initial value
        setPrefersReducedMotion(mediaQuery.matches);

        // Listen for changes
        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return prefersReducedMotion;
}
