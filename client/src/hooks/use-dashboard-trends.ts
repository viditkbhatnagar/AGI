import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook to fetch dashboard trend data
 * Provides 7-day trend arrays for sparkline charts
 * Auto-refreshes every 30 seconds for real-time updates
 */
export function useDashboardTrends() {
    return useQuery({
        queryKey: ["/api/admin/dashboard", "trends"],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/dashboard", {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error("Failed to fetch dashboard trends");
            const data = await res.json();
            return data.trends;
        },
        // Auto-refresh every 30 seconds
        refetchInterval: 30000,
        // Keep previous data while fetching new data
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Hook to get student enrollment trend data
 * Returns array of daily student counts for last 7 days
 */
export function useStudentTrend() {
    const { data } = useDashboardTrends();
    return data?.students || [];
}

/**
 * Hook to get course additions trend data
 * Returns array of daily course counts for last 7 days
 */
export function useCourseTrend() {
    const { data } = useDashboardTrends();
    return data?.courses || [];
}

/**
 * Hook to get enrollment growth trend data
 * Returns array of daily enrollment counts for last 7 days
 */
export function useEnrollmentTrend() {
    const { data } = useDashboardTrends();
    return data?.enrollments || [];
}

/**
 * Hook to get live class scheduling trend data
 * Returns array of daily live class counts for last 7 days
 */
export function useLiveClassTrend() {
    const { data } = useDashboardTrends();
    return data?.liveClasses || [];
}
