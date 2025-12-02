import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { useState } from 'react';

interface NeuralDonutChartProps {
    data: { name: string; value: number }[];
    colors?: string[];
    centerLabel?: string;
    centerValue?: string;
}

/**
 * AI-themed neural network donut chart with glowing effects
 * Features animated segments and interactive hover states
 */
export function NeuralDonutChart({
    data,
    colors = [
        'hsl(220, 70%, 50%)',
        'hsl(174, 72%, 50%)',
        'hsl(43, 96%, 60%)',
        'hsl(280, 70%, 60%)',
    ],
    centerLabel,
    centerValue,
}: NeuralDonutChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

    const renderActiveShape = (props: any) => {
        const {
            cx,
            cy,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
            fill,
            payload,
            percent,
        } = props;

        return (
            <g>
                {/* Outer glow ring */}
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={outerRadius + 5}
                    outerRadius={outerRadius + 12}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    opacity={0.3}
                    style={{ filter: 'blur(8px)' }}
                />
                {/* Main segment */}
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                {/* Data label */}
                <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fill="hsl(var(--color-text-primary))"
                    className="text-lg font-semibold"
                >
                    {payload.name}
                </text>
                <text
                    x={cx}
                    y={cy + 10}
                    textAnchor="middle"
                    fill="hsl(var(--color-text-secondary))"
                    className="text-sm"
                >
                    {`${(percent * 100).toFixed(1)}%`}
                </text>
                <text
                    x={cx}
                    y={cy + 28}
                    textAnchor="middle"
                    fill="hsl(var(--color-text-tertiary))"
                    className="text-xs"
                >
                    {`${payload.value} courses`}
                </text>
            </g>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full h-full"
        >
            {/* Neural network background effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg className="w-full h-full">
                    <defs>
                        <radialGradient id="neuralGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="hsl(220, 70%, 50%)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="hsl(220, 70%, 50%)" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <circle cx="50%" cy="50%" r="40%" fill="url(#neuralGlow)" />
                </svg>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(undefined)}
                        animationBegin={0}
                        animationDuration={1200}
                        animationEasing="ease-out"
                    >
                        {data.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={colors[index % colors.length]}
                                style={{
                                    filter: activeIndex === index ? 'brightness(1.2)' : 'none',
                                    transition: 'filter 0.3s ease',
                                }}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            {centerLabel && activeIndex === undefined && (
                <motion.div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {centerLabel}
                    </span>
                    {centerValue && (
                        <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                            {centerValue}
                        </span>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
