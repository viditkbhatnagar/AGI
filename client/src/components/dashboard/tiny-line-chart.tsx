import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface TinyLineChartProps {
    data: number[];
    color?: string;
}

/**
 * Tiny sparkline chart for KPI cards
 * Simple line chart showing data trend
 */
export function TinyLineChart({
    data,
    color = 'hsl(var(--color-primary-500))'
}: TinyLineChartProps) {
    const chartData = data.map((value, index) => ({ index, value }));

    return (
        <ResponsiveContainer width="100%" height={40}>
            <LineChart data={chartData}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-in-out"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
