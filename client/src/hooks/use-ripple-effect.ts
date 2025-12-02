import { useCallback, useRef } from 'react';

interface RippleEffect {
    x: number;
    y: number;
    size: number;
}

/**
 * Custom hook for creating ripple click effects
 * Returns a ref and click handler for ripple animation
 */
export function useRippleEffect() {
    const rippleRef = useRef<HTMLDivElement>(null);

    const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();

        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.className = 'ripple-effect';

        const rippleContainer = button.querySelector('.ripple-container');
        if (rippleContainer) {
            rippleContainer.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
    }, []);

    return { rippleRef, createRipple };
}
