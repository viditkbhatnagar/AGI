import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Activity,
    Cpu,
    DollarSign,
    Clock,
    Zap,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Sparkles,
    Brain,
    BarChart3,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
    RadialBarChart,
    RadialBar,
    ComposedChart,
    Line,
} from "recharts";

interface ProviderStats {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCost: number;
    avgLatencyMs: number;
    lastCallAt: string | null;
    callsToday: number;
    tokensToday: number;
    costToday: number;
}

interface APICallRecord {
    id: string;
    provider: "gemini" | "openai";
    model: string;
    endpoint: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costEstimate: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    timestamp: string;
}


interface APIUsageStats {
    gemini: ProviderStats;
    openai: ProviderStats;
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    recentCalls: APICallRecord[];
}

// Chart colors
const COLORS = {
    openai: "#8B5CF6",
    gemini: "#3B82F6",
    prompt: "#10B981",
    completion: "#F59E0B",
    success: "#22C55E",
    failed: "#EF4444",
};

const GRADIENT_COLORS = {
    openai: ["#8B5CF6", "#A78BFA"],
    gemini: ["#3B82F6", "#60A5FA"],
};

function formatCost(cost: number): string {
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function formatLatency(ms: number): string {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AdminAPIUsage() {
    const [autoRefresh, setAutoRefresh] = useState(true);

    const { data, isLoading, error, refetch } = useQuery<{ success: boolean; data: APIUsageStats }>({
        queryKey: ["api-usage"],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/api-usage", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch API usage");
            return res.json();
        },
        refetchInterval: autoRefresh ? 5000 : false,
    });

    const stats = data?.data;

    // Process data for charts
    const chartData = useMemo(() => {
        if (!stats) return null;

        // Provider comparison data
        const providerComparison = [
            { name: "OpenAI GPT-5", calls: stats.openai.totalCalls, tokens: stats.openai.totalTokens, cost: stats.openai.totalCost, fill: COLORS.openai },
            { name: "Google Gemini", calls: stats.gemini.totalCalls, tokens: stats.gemini.totalTokens, cost: stats.gemini.totalCost, fill: COLORS.gemini },
        ];

        // Token distribution pie chart
        const tokenDistribution = [
            { name: "OpenAI Prompt", value: stats.openai.totalPromptTokens, fill: "#8B5CF6" },
            { name: "OpenAI Completion", value: stats.openai.totalCompletionTokens, fill: "#A78BFA" },
            { name: "Gemini Prompt", value: stats.gemini.totalPromptTokens, fill: "#3B82F6" },
            { name: "Gemini Completion", value: stats.gemini.totalCompletionTokens, fill: "#60A5FA" },
        ].filter(d => d.value > 0);

        // Success rate radial chart
        const successRateData = [
            { 
                name: "OpenAI", 
                value: stats.openai.totalCalls > 0 ? Math.round((stats.openai.successfulCalls / stats.openai.totalCalls) * 100) : 100,
                fill: COLORS.openai 
            },
            { 
                name: "Gemini", 
                value: stats.gemini.totalCalls > 0 ? Math.round((stats.gemini.successfulCalls / stats.gemini.totalCalls) * 100) : 100,
                fill: COLORS.gemini 
            },
        ];

        // Timeline data from recent calls
        const timelineData = stats.recentCalls
            .slice(0, 20)
            .reverse()
            .map((call, idx) => ({
                time: `${idx + 1}`,
                tokens: call.totalTokens,
                latency: call.latencyMs,
                cost: call.costEstimate * 1000, // Scale for visibility
                provider: call.provider,
            }));

        // Cost breakdown
        const costBreakdown = [
            { name: "OpenAI", value: stats.openai.totalCost, fill: COLORS.openai },
            { name: "Gemini", value: stats.gemini.totalCost, fill: COLORS.gemini },
        ].filter(d => d.value > 0);

        // Latency comparison
        const latencyData = [
            { name: "OpenAI GPT-5", latency: stats.openai.avgLatencyMs, fill: COLORS.openai },
            { name: "Google Gemini", latency: stats.gemini.avgLatencyMs, fill: COLORS.gemini },
        ];

        return {
            providerComparison,
            tokenDistribution,
            successRateData,
            timelineData,
            costBreakdown,
            latencyData,
        };
    }, [stats]);

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="h-6 w-6 text-indigo-600" />
                            API Usage Analytics
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Real-time tracking of Gemini and GPT-5 API calls with advanced analytics
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={autoRefresh ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50"}>
                            {autoRefresh ? "● Live" : "○ Paused"}
                        </Badge>
                        <Button
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {isLoading && !stats && (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-gray-500">Loading analytics...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="h-5 w-5" />
                                <span>Failed to load API usage data</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {stats && chartData && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <SummaryCard
                                title="Total API Calls"
                                value={formatNumber(stats.totalCalls)}
                                icon={<Zap className="h-6 w-6" />}
                                gradient="from-indigo-500 to-purple-600"
                                subValue={`Today: ${stats.openai.callsToday + stats.gemini.callsToday}`}
                            />
                            <SummaryCard
                                title="Total Tokens"
                                value={formatNumber(stats.totalTokens)}
                                icon={<Cpu className="h-6 w-6" />}
                                gradient="from-emerald-500 to-teal-600"
                                subValue={`Today: ${formatNumber(stats.openai.tokensToday + stats.gemini.tokensToday)}`}
                            />
                            <SummaryCard
                                title="Total Cost"
                                value={formatCost(stats.totalCost)}
                                icon={<DollarSign className="h-6 w-6" />}
                                gradient="from-amber-500 to-orange-600"
                                subValue={`Today: ${formatCost(stats.openai.costToday + stats.gemini.costToday)}`}
                            />
                            <SummaryCard
                                title="Avg Latency"
                                value={formatLatency(Math.round((stats.gemini.avgLatencyMs + stats.openai.avgLatencyMs) / 2))}
                                icon={<Clock className="h-6 w-6" />}
                                gradient="from-blue-500 to-cyan-600"
                                subValue="Across all providers"
                            />
                        </div>

                        {/* Charts Section */}
                        <Tabs defaultValue="overview" className="space-y-4">
                            <TabsList className="bg-gray-100 p-1">
                                <TabsTrigger value="overview" className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="tokens" className="flex items-center gap-2">
                                    <PieChartIcon className="h-4 w-4" />
                                    Token Analysis
                                </TabsTrigger>
                                <TabsTrigger value="timeline" className="flex items-center gap-2">
                                    <LineChartIcon className="h-4 w-4" />
                                    Timeline
                                </TabsTrigger>
                                <TabsTrigger value="providers" className="flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Providers
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Provider Comparison Bar Chart */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                                Provider Comparison
                                            </CardTitle>
                                            <CardDescription>API calls and tokens by provider</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={chartData.providerComparison} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                    <XAxis type="number" tickFormatter={formatNumber} />
                                                    <YAxis type="category" dataKey="name" width={100} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend />
                                                    <Bar dataKey="calls" name="API Calls" fill={COLORS.openai} radius={[0, 4, 4, 0]} />
                                                    <Bar dataKey="tokens" name="Tokens" fill={COLORS.gemini} radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Cost Breakdown Pie Chart */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <DollarSign className="h-5 w-5 text-amber-600" />
                                                Cost Distribution
                                            </CardTitle>
                                            <CardDescription>Total cost breakdown by provider</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={chartData.costBreakdown}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, value }) => `${name}: ${formatCost(value)}`}
                                                    >
                                                        {chartData.costBreakdown.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => formatCost(value)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="tokens" className="space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Token Distribution */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Cpu className="h-5 w-5 text-emerald-600" />
                                                Token Distribution
                                            </CardTitle>
                                            <CardDescription>Prompt vs Completion tokens by provider</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={chartData.tokenDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={100}
                                                        dataKey="value"
                                                        label={({ name, value }) => `${formatNumber(value)}`}
                                                    >
                                                        {chartData.tokenDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Token Breakdown Cards */}
                                    <div className="space-y-4">
                                        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Brain className="h-8 w-8 text-purple-600" />
                                                    <div>
                                                        <h3 className="font-semibold text-purple-900">OpenAI GPT-5</h3>
                                                        <p className="text-sm text-purple-600">Token breakdown</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500">Prompt Tokens</p>
                                                        <p className="text-xl font-bold text-purple-900">{formatNumber(stats.openai.totalPromptTokens)}</p>
                                                    </div>
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500">Completion Tokens</p>
                                                        <p className="text-xl font-bold text-purple-900">{formatNumber(stats.openai.totalCompletionTokens)}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Sparkles className="h-8 w-8 text-blue-600" />
                                                    <div>
                                                        <h3 className="font-semibold text-blue-900">Google Gemini</h3>
                                                        <p className="text-sm text-blue-600">Token breakdown</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500">Prompt Tokens</p>
                                                        <p className="text-xl font-bold text-blue-900">{formatNumber(stats.gemini.totalPromptTokens)}</p>
                                                    </div>
                                                    <div className="bg-white/60 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500">Completion Tokens</p>
                                                        <p className="text-xl font-bold text-blue-900">{formatNumber(stats.gemini.totalCompletionTokens)}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="timeline" className="space-y-4">
                                {/* Timeline Area Chart */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                                            Recent API Activity
                                        </CardTitle>
                                        <CardDescription>Tokens and latency over last 20 calls</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <ComposedChart data={chartData.timelineData}>
                                                <defs>
                                                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                <XAxis dataKey="time" label={{ value: 'Call #', position: 'bottom' }} />
                                                <YAxis yAxisId="left" tickFormatter={formatNumber} />
                                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}ms`} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                                <Area
                                                    yAxisId="left"
                                                    type="monotone"
                                                    dataKey="tokens"
                                                    name="Tokens"
                                                    stroke="#8B5CF6"
                                                    fill="url(#tokenGradient)"
                                                />
                                                <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="latency"
                                                    name="Latency (ms)"
                                                    stroke="#3B82F6"
                                                    strokeWidth={2}
                                                    dot={{ fill: "#3B82F6" }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="providers" className="space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Success Rate Radial Chart */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                Success Rate
                                            </CardTitle>
                                            <CardDescription>API call success rate by provider</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <RadialBarChart
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="30%"
                                                    outerRadius="90%"
                                                    data={chartData.successRateData}
                                                    startAngle={180}
                                                    endAngle={0}
                                                >
                                                    <RadialBar
                                                        background
                                                        dataKey="value"
                                                        cornerRadius={10}
                                                        label={{ fill: '#666', position: 'insideStart', formatter: (v: number) => `${v}%` }}
                                                    />
                                                    <Legend
                                                        iconSize={10}
                                                        layout="horizontal"
                                                        verticalAlign="bottom"
                                                    />
                                                    <Tooltip formatter={(value: number) => `${value}%`} />
                                                </RadialBarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Latency Comparison */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Clock className="h-5 w-5 text-blue-600" />
                                                Average Latency
                                            </CardTitle>
                                            <CardDescription>Response time comparison</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={chartData.latencyData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis tickFormatter={(v) => `${v}ms`} />
                                                    <Tooltip formatter={(value: number) => formatLatency(value)} />
                                                    <Bar dataKey="latency" name="Avg Latency" radius={[8, 8, 0, 0]}>
                                                        {chartData.latencyData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Provider Detail Cards */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <ProviderDetailCard
                                        name="OpenAI GPT-5"
                                        icon={<Brain className="h-6 w-6" />}
                                        color="purple"
                                        stats={stats.openai}
                                    />
                                    <ProviderDetailCard
                                        name="Google Gemini"
                                        icon={<Sparkles className="h-6 w-6" />}
                                        color="blue"
                                        stats={stats.gemini}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Recent Calls Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-gray-600" />
                                    Recent API Calls
                                </CardTitle>
                                <CardDescription>Last 50 API calls across all providers</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="text-left p-3 font-medium">Time</th>
                                                <th className="text-left p-3 font-medium">Provider</th>
                                                <th className="text-left p-3 font-medium">Model</th>
                                                <th className="text-right p-3 font-medium">Tokens</th>
                                                <th className="text-right p-3 font-medium">Cost</th>
                                                <th className="text-right p-3 font-medium">Latency</th>
                                                <th className="text-center p-3 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentCalls.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center p-8 text-gray-500">
                                                        <div className="flex flex-col items-center">
                                                            <Activity className="h-12 w-12 text-gray-300 mb-2" />
                                                            <p>No API calls recorded yet</p>
                                                            <p className="text-xs text-gray-400 mt-1">Generate some flashcards to see API usage</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                stats.recentCalls.map((call) => (
                                                    <tr key={call.id} className="border-b hover:bg-gray-50 transition-colors">
                                                        <td className="p-3 text-gray-600">{timeAgo(call.timestamp)}</td>
                                                        <td className="p-3">
                                                            <Badge variant="outline" className={
                                                                call.provider === "openai" 
                                                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                                            }>
                                                                {call.provider === "openai" ? "OpenAI" : "Gemini"}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 font-mono text-xs">{call.model}</td>
                                                        <td className="p-3 text-right font-medium">{formatNumber(call.totalTokens)}</td>
                                                        <td className="p-3 text-right font-mono text-xs">{formatCost(call.costEstimate)}</td>
                                                        <td className="p-3 text-right">{formatLatency(call.latencyMs)}</td>
                                                        <td className="p-3 text-center">
                                                            {call.success ? (
                                                                <CheckCircle className="h-5 w-5 text-green-500 inline" />
                                                            ) : (
                                                                <XCircle className="h-5 w-5 text-red-500 inline" />
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}


// Summary Card Component
interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    gradient: string;
    subValue: string;
}

function SummaryCard({ title, value, icon, gradient, subValue }: SummaryCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">{title}</p>
                            <p className="text-3xl font-bold mt-1">{value}</p>
                            <p className="text-xs text-white/70 mt-2">{subValue}</p>
                        </div>
                        <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            {icon}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Provider Detail Card Component
interface ProviderDetailCardProps {
    name: string;
    icon: React.ReactNode;
    color: "purple" | "blue";
    stats: ProviderStats;
}

function ProviderDetailCard({ name, icon, color, stats }: ProviderDetailCardProps) {
    const colorClasses = {
        purple: {
            bg: "bg-gradient-to-br from-purple-50 to-violet-50",
            border: "border-purple-200",
            iconBg: "bg-purple-100",
            iconText: "text-purple-600",
            text: "text-purple-900",
            subtext: "text-purple-600",
            accent: "bg-purple-500",
        },
        blue: {
            bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
            border: "border-blue-200",
            iconBg: "bg-blue-100",
            iconText: "text-blue-600",
            text: "text-blue-900",
            subtext: "text-blue-600",
            accent: "bg-blue-500",
        },
    };

    const c = colorClasses[color];
    const successRate = stats.totalCalls > 0 
        ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) 
        : 100;

    return (
        <Card className={`${c.bg} ${c.border}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 ${c.iconBg} rounded-xl flex items-center justify-center ${c.iconText}`}>
                            {icon}
                        </div>
                        <div>
                            <CardTitle className={c.text}>{name}</CardTitle>
                            <CardDescription>
                                Last call: {timeAgo(stats.lastCallAt)}
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className={
                        successRate >= 95 
                            ? "bg-green-50 text-green-700 border-green-200"
                            : successRate >= 80
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : "bg-red-50 text-red-700 border-red-200"
                    }>
                        {successRate}% Success
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Calls</p>
                        <p className={`text-lg font-bold ${c.text}`}>{formatNumber(stats.totalCalls)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Tokens</p>
                        <p className={`text-lg font-bold ${c.text}`}>{formatNumber(stats.totalTokens)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Cost</p>
                        <p className={`text-lg font-bold ${c.text}`}>{formatCost(stats.totalCost)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Latency</p>
                        <p className={`text-lg font-bold ${c.text}`}>{formatLatency(stats.avgLatencyMs)}</p>
                    </div>
                </div>

                {/* Today's Stats */}
                <div className="bg-white/50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Today's Usage</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${c.accent}`} />
                            <div>
                                <p className="text-xs text-gray-500">Calls</p>
                                <p className="font-semibold">{stats.callsToday}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${c.accent}`} />
                            <div>
                                <p className="text-xs text-gray-500">Tokens</p>
                                <p className="font-semibold">{formatNumber(stats.tokensToday)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${c.accent}`} />
                            <div>
                                <p className="text-xs text-gray-500">Cost</p>
                                <p className="font-semibold">{formatCost(stats.costToday)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Token Breakdown Progress */}
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-600 font-medium">Token Distribution</span>
                        <span className="text-gray-500">
                            Prompt: {formatNumber(stats.totalPromptTokens)} | Completion: {formatNumber(stats.totalCompletionTokens)}
                        </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                        <div 
                            className={`${c.accent} transition-all duration-500`}
                            style={{ 
                                width: stats.totalTokens > 0 
                                    ? `${(stats.totalPromptTokens / stats.totalTokens) * 100}%` 
                                    : "50%" 
                            }}
                        />
                        <div 
                            className="bg-gray-400"
                            style={{ 
                                width: stats.totalTokens > 0 
                                    ? `${(stats.totalCompletionTokens / stats.totalTokens) * 100}%` 
                                    : "50%" 
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                        <span className={c.subtext}>Prompt</span>
                        <span className="text-gray-500">Completion</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
