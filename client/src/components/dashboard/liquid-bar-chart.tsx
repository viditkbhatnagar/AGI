import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface LiquidBarChartProps {
    data: { name: string; value: number }[];
    color?: string;
    showAnimation?: boolean;
}

/**
 * Liquid-style bar chart with wave effects
 * Perfect for enrollment trends and time-series data
 */
export function LiquidBarChart({
    data,
    color = 'hsl(220, 70%, 55%)',
    showAnimation = true,
}: LiquidBarChartProps) {
    const prefersReducedMotion = useReducedMotion();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    className="bg-white dark:bg-neutral-800 px-4 py-3 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {label}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        Enrollments: <span className="font-medium text-primary-600">{payload[0].value}</span>
                    </p>
                </motion.div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
        >
            {/* Ambient glow */}
            <div className="absolute inset-0 opacity-20 pointer-events-none blur-3xl">
                <div
                    className="absolute top-0 left-1/4 w-1/2 h-1/2 rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <defs>
                        <linearGradient id="liquidGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="50%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                        </linearGradient>

                        {/* Wave pattern */}
                        <pattern id="waves" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path
                                d="M 0 10 Q 5 5 10 10 T 20 10"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="1"
                            />
                            <path
                                d="M 0 15 Q 5 10 10 15 T 20 15"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="0.5"
                            />
                        </pattern>

                        {/* Glow filter */}
                        <filter id="liquidGlow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--color-border-subtle))"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="name"
                        stroke="hsl(var(--color-text-tertiary))"
                        fontSize={12}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--color-text-tertiary))"
                        fontSize={12}
                        tickLine={false}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--color-neutral-100))' }} />

                    <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                        animationBegin={0}
                        animationDuration={showAnimation && !prefersReducedMotion ? 1500 : 10}
                        animationEasing="ease-out"
                        filter="url(#liquidGlow)"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill="url(#liquidGradient)"
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Liquid bubbles effect */}
            {!prefersReducedMotion && showAnimation && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: 8 + Math.random() * 12,
                                height: 8 + Math.random() * 12,
                                backgroundColor: color,
                                opacity: 0.15,
                                left: `${15 + i * 13}%`,
                                bottom: '10%',
                            }}
                            animate={{
                                y: [-10, -80, -10],
                                opacity: [0.15, 0.3, 0],
                                scale: [1, 1.2, 0.8],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: i * 0.5,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
