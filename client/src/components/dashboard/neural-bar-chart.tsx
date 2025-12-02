import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface NeuralBarChartProps {
    data: { name: string;[key: string]: any }[];
    dataKeys: string[];
    colors: string[];
    showGrid?: boolean;
    animated?: boolean;
}

/**
 * Neural network-inspired stacked bar chart
 * Features layered gradients and connection lines between bars
 */
export function NeuralBarChart({
    data,
    dataKeys,
    colors,
    showGrid = true,
    animated = true,
}: NeuralBarChartProps) {
    const prefersReducedMotion = useReducedMotion();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-neutral-600 dark:text-neutral-400">
                                {entry.name}:
                            </span>
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                {entry.value}
                            </span>
                        </div>
                    ))}
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
            {/* Neural network background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <svg className="w-full h-full">
                    <defs>
                        <pattern
                            id="neural-grid"
                            x="0"
                            y="0"
                            width="40"
                            height="40"
                            patternUnits="userSpaceOnUse"
                        >
                            <circle cx="20" cy="20" r="1.5" fill="hsl(220, 70%, 50%)" />
                            <line
                                x1="20"
                                y1="20"
                                x2="40"
                                y2="20"
                                stroke="hsl(220, 70%, 50%)"
                                strokeWidth="0.5"
                                opacity="0.3"
                            />
                            <line
                                x1="20"
                                y1="20"
                                x2="20"
                                y2="40"
                                stroke="hsl(220, 70%, 50%)"
                                strokeWidth="0.5"
                                opacity="0.3"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#neural-grid)" />
                </svg>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
                    <defs>
                        {dataKeys.map((key, index) => (
                            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={colors[index]} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={colors[index]} stopOpacity={0.6} />
                            </linearGradient>
                        ))}
                    </defs>

                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--color-border-subtle))"
                            horizontal={false}
                        />
                    )}

                    <XAxis
                        type="number"
                        stroke="hsl(var(--color-text-tertiary))"
                        fontSize={12}
                    />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={180}
                        stroke="hsl(var(--color-text-tertiary))"
                        fontSize={12}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--color-neutral-100))' }} />

                    {dataKeys.map((key, index) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="a"
                            fill={`url(#gradient-${key})`}
                            radius={index === dataKeys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                            animationBegin={0}
                            animationDuration={animated && !prefersReducedMotion ? 1200 : 10}
                            animationEasing="ease-out"
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>

            {/* Floating particles */}
            {!prefersReducedMotion && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(10)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary-400 to-accent-400"
                            style={{
                                left: `${10 + Math.random() * 80}%`,
                                bottom: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [-20, -60, -20],
                                opacity: [0, 0.6, 0],
                                scale: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 4 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 3,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
