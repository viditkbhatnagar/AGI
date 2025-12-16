/**
 * API Usage Tracking Service
 * Tracks Gemini and GPT-5 API calls with detailed metrics
 */

export interface APICallRecord {
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
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface APIUsageStats {
    gemini: ProviderStats;
    openai: ProviderStats;
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    recentCalls: APICallRecord[];
}

export interface ProviderStats {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCost: number;
    avgLatencyMs: number;
    lastCallAt: Date | null;
    callsToday: number;
    tokensToday: number;
    costToday: number;
}

// Pricing per 1M tokens (approximate)
const PRICING = {
    gemini: {
        "gemini-1.5-flash": { input: 0.075, output: 0.30 },
        "gemini-1.5-pro": { input: 1.25, output: 5.00 },
        "gemini-2.0-flash": { input: 0.10, output: 0.40 },
        default: { input: 0.10, output: 0.40 },
    },
    openai: {
        "gpt-5": { input: 5.00, output: 15.00 },
        "gpt-4o": { input: 2.50, output: 10.00 },
        "gpt-4o-mini": { input: 0.15, output: 0.60 },
        default: { input: 5.00, output: 15.00 },
    },
};

// In-memory storage (can be replaced with DB later)
const apiCallRecords: APICallRecord[] = [];
const MAX_RECORDS = 1000;

/**
 * Record an API call
 */
export function recordAPICall(record: Omit<APICallRecord, "id" | "costEstimate">): APICallRecord {
    const providerPricing = PRICING[record.provider] as Record<string, { input: number; output: number }>;
    const pricing = providerPricing[record.model] || providerPricing.default;
    
    const costEstimate = (
        (record.promptTokens / 1_000_000) * pricing.input +
        (record.completionTokens / 1_000_000) * pricing.output
    );

    const fullRecord: APICallRecord = {
        ...record,
        id: `${record.provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        costEstimate: Math.round(costEstimate * 1000000) / 1000000, // 6 decimal places
    };

    apiCallRecords.unshift(fullRecord);
    
    // Keep only last MAX_RECORDS
    if (apiCallRecords.length > MAX_RECORDS) {
        apiCallRecords.pop();
    }

    console.log(`[APIUsage] Recorded ${record.provider}/${record.model}: ${record.totalTokens} tokens, $${fullRecord.costEstimate.toFixed(6)}`);
    
    return fullRecord;
}

/**
 * Get usage statistics
 */
export function getAPIUsageStats(): APIUsageStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const geminiCalls = apiCallRecords.filter(r => r.provider === "gemini");
    const openaiCalls = apiCallRecords.filter(r => r.provider === "openai");

    const calculateStats = (calls: APICallRecord[]): ProviderStats => {
        const todayCalls = calls.filter(c => new Date(c.timestamp) >= todayStart);
        const successfulCalls = calls.filter(c => c.success);
        
        return {
            totalCalls: calls.length,
            successfulCalls: successfulCalls.length,
            failedCalls: calls.length - successfulCalls.length,
            totalPromptTokens: calls.reduce((sum, c) => sum + c.promptTokens, 0),
            totalCompletionTokens: calls.reduce((sum, c) => sum + c.completionTokens, 0),
            totalTokens: calls.reduce((sum, c) => sum + c.totalTokens, 0),
            totalCost: calls.reduce((sum, c) => sum + c.costEstimate, 0),
            avgLatencyMs: calls.length > 0 
                ? Math.round(calls.reduce((sum, c) => sum + c.latencyMs, 0) / calls.length)
                : 0,
            lastCallAt: calls.length > 0 ? calls[0].timestamp : null,
            callsToday: todayCalls.length,
            tokensToday: todayCalls.reduce((sum, c) => sum + c.totalTokens, 0),
            costToday: todayCalls.reduce((sum, c) => sum + c.costEstimate, 0),
        };
    };

    return {
        gemini: calculateStats(geminiCalls),
        openai: calculateStats(openaiCalls),
        totalCalls: apiCallRecords.length,
        totalTokens: apiCallRecords.reduce((sum, c) => sum + c.totalTokens, 0),
        totalCost: apiCallRecords.reduce((sum, c) => sum + c.costEstimate, 0),
        recentCalls: apiCallRecords.slice(0, 50),
    };
}

/**
 * Clear all records (for testing)
 */
export function clearAPIUsageRecords(): void {
    apiCallRecords.length = 0;
}

export default {
    recordAPICall,
    getAPIUsageStats,
    clearAPIUsageRecords,
};
