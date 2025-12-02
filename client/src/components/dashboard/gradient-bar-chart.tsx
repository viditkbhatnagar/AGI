import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface GradientBarChartProps {
    data: { name: string; value: number }[];
    dataKey?: string;
    layout?: 'horizontal' | 'vertical';
    showGrid?: boolean;
    gradientColors?: [string, string];
}

/**
 * Modern gradient bar chart with particle effects
 * Features smooth animations and AI-themed styling
 */
export function GradientBarChart({
    data,
    dataKey = 'value',
    layout = 'vertical',
    showGrid = true,
    gradientColors = ['hsl(220, 70%, 60%)', 'hsl(174, 72%, 55%)'],
}: GradientBarChartProps) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout={layout}
                    margin={{ left: layout === 'vertical' ? 40 : 20, right: 20, top: 10, bottom: 10 }}
                >
                    <defs>
                        {data.map((_, index) => (
                            <linearGradient
                                key={`gradient-${index}`}
                                id={`barGradient${index}`}
                                x1="0"
                                y1="0"
                                x2={layout === 'horizontal' ? "0" : "1"}
                                y2={layout === 'horizontal' ? "1" : "0"}
                            >
                                <stop offset="0%" stopColor={gradientColors[0]} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={gradientColors[1]} stopOpacity={0.9} />
                            </linearGradient>
                        ))}
                        {/* Glow effect */}
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--color-border-subtle))"
                            horizontal={layout === 'horizontal'}
                            vertical={layout === 'vertical'}
                        />
                    )}

                    {layout === 'horizontal' ? (
                        <>
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--color-text-tertiary))"
                                fontSize={12}
                            />
                            <YAxis stroke="hsl(var(--color-text-tertiary))" fontSize={12} />
                        </>
                    ) : (
                        <>
                            <XAxis
                                type="number"
                                stroke="hsl(var(--color-text-tertiary))"
                                fontSize={12}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={150}
                                stroke="hsl(var(--color-text-tertiary))"
                                fontSize={12}
                            />
                        </>
                    )}

                    <Bar
                        dataKey={dataKey}
                        radius={layout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]}
                        animationBegin={0}
                        animationDuration={prefersReducedMotion ? 10 : 1000}
                        animationEasing="ease-out"
                        filter="url(#glow)"
                    >
                        {data.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#barGradient${index})`}
                                style={{
                                    transition: 'opacity 0.3s ease',
                                }}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Particle effect overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-accent-500 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );
}
