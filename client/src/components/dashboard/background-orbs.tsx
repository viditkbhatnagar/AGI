import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { motion } from 'framer-motion';

/**
 * Animated background gradient orbs for premium visual effect
 * Features slow floating animation with reduced motion support
 */
export function BackgroundOrbs() {
    const prefersReducedMotion = useReducedMotion();

    const orbs = [
        {
            id: 1,
            className: 'bg-gradient-to-br from-primary-500/20 to-accent-500/20',
            size: '400px',
            top: '10%',
            left: '5%',
            delay: 0,
        },
        {
            id: 2,
            className: 'bg-gradient-to-tr from-accent-500/15 to-secondary-500/15',
            size: '350px',
            top: '60%',
            left: '70%',
            delay: 5,
        },
        {
            id: 3,
            className: 'bg-gradient-to-bl from-secondary-500/10 to-primary-500/10',
            size: '300px',
            top: '40%',
            left: '40%',
            delay: 10,
        },
    ];

    if (prefersReducedMotion) {
        return (
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                {orbs.map((orb) => (
                    <div
                        key={orb.id}
                        className={`absolute rounded-full blur-3xl ${orb.className}`}
                        style={{
                            width: orb.size,
                            height: orb.size,
                            top: orb.top,
                            left: orb.left,
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {orbs.map((orb) => (
                <motion.div
                    key={orb.id}
                    className={`absolute rounded-full blur-3xl ${orb.className}`}
                    style={{
                        width: orb.size,
                        height: orb.size,
                        top: orb.top,
                        left: orb.left,
                    }}
                    animate={{
                        y: [0, -30, 15, 0],
                        x: [0, 20, -15, 0],
                    }}
                    transition={{
                        duration: 20,
                        delay: orb.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}
