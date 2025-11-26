import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { RefreshCw, Search, Calendar } from "lucide-react";
import { format } from "date-fns";

interface LoginEntry {
    timestamp: string;
}

interface UserLoginData {
    _id: string;
    name: string;
    phone?: string;
    email: string;
    username: string;
    role?: string;
    loginHistory: LoginEntry[];
}

interface LoginHistoryResponse {
    users: UserLoginData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Helper to format timestamp
function formatTimestamp(timestamp: string | null): string {
    if (!timestamp) return "Never";
    try {
        const date = new Date(timestamp);
        return format(date, "MMM dd, yyyy HH:mm:ss");
    } catch {
        return "Invalid date";
    }
}

export function LastLoginsComponent() {
    const [activeTab, setActiveTab] = useState<"students" | "teachers">("students");
    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const [studentNameFilter, setStudentNameFilter] = useState("");
    const [teacherNameFilter, setTeacherNameFilter] = useState("");
    const [studentCourseFilter, setStudentCourseFilter] = useState("all");
    const [autoRefresh, setAutoRefresh] = useState(true);

    const limit = 10;

    // Fetch students login history
    const {
        data: studentsData,
        isLoading: studentsLoading,
        refetch: refetchStudents,
    } = useQuery<LoginHistoryResponse>({
        queryKey: [
            "/api/admin/login-history/students",
            studentPage,
            studentNameFilter,
            studentCourseFilter,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: studentPage.toString(),
                limit: limit.toString(),
            });
            if (studentNameFilter) params.append("name", studentNameFilter);
            if (studentCourseFilter && studentCourseFilter !== "all") {
                params.append("courseSlug", studentCourseFilter);
            }

            const token = localStorage.getItem("token");
            const res = await fetch(`/api/admin/login-history/students?${params}`, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error("Failed to fetch students login history");
            return res.json();
        },
        refetchInterval: autoRefresh ? 60000 : false, // Auto-refresh every 60 seconds
    });

    // Fetch teachers login history
    const {
        data: teachersData,
        isLoading: teachersLoading,
        refetch: refetchTeachers,
    } = useQuery<LoginHistoryResponse>({
        queryKey: ["/api/admin/login-history/teachers", teacherPage, teacherNameFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: teacherPage.toString(),
                limit: limit.toString(),
            });
            if (teacherNameFilter) params.append("name", teacherNameFilter);

            const token = localStorage.getItem("token");
            const res = await fetch(`/api/admin/login-history/teachers?${params}`, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error("Failed to fetch teachers login history");
            return res.json();
        },
        refetchInterval: autoRefresh ? 60000 : false, // Auto-refresh every 60 seconds
    });

    // Fetch courses for filter
    const { data: courses = [] } = useQuery({
        queryKey: ["/api/admin/courses"],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/admin/courses", {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error("Failed to fetch courses");
            return res.json();
        },
    });

    const handleManualRefresh = () => {
        if (activeTab === "students") {
            refetchStudents();
        } else {
            refetchTeachers();
        }
    };

    const renderLoginTimestamps = (loginHistory: LoginEntry[]) => {
        if (!loginHistory || loginHistory.length === 0) {
            return <span className="text-gray-400 italic">No logins recorded</span>;
        }

        return (
            <div className="space-y-1">
                {loginHistory.slice(0, 5).map((login, index) => (
                    <div key={index} className="text-sm">
                        {index + 1}. {formatTimestamp(login.timestamp)}
                    </div>
                ))}
            </div>
        );
    };

    const renderTable = (
        data: LoginHistoryResponse | undefined,
        isLoading: boolean,
        page: number,
        setPage: (page: number) => void,
        userType: "student" | "teacher"
    ) => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            );
        }

        if (!data || data.users.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No {userType}s found matching your filters</p>
                </div>
            );
        }

        return (
            <>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="min-w-[300px]">Last 5 Logins</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.users.map((user) => (
                                <TableRow key={user._id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{renderLoginTimestamps(user.loginHistory)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.total)} of{" "}
                        {data.total} {userType}s
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {page} of {data.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page >= data.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Last Logins</h1>
                <div className="mt-2 md:mt-0 flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        className="flex items-center"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <div className="flex items-center space-x-2 text-sm">
                        <input
                            type="checkbox"
                            id="auto-refresh"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <label htmlFor="auto-refresh" className="text-gray-600">
                            Auto-refresh (1 min)
                        </label>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b">
                <button
                    onClick={() => setActiveTab("students")}
                    className={`pb-2 px-4 font-semibold ${activeTab === "students"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Students ({studentsData?.total ?? 0})
                </button>
                <button
                    onClick={() => setActiveTab("teachers")}
                    className={`pb-2 px-4 font-semibold ${activeTab === "teachers"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Teachers & Admins ({teachersData?.total ?? 0})
                </button>
            </div>

            {/* Students Tab */}
            {activeTab === "students" && (
                <Card>
                    <CardContent className="pt-6">
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Search className="inline h-4 w-4 mr-1" />
                                    Search by Name
                                </label>
                                <Input
                                    placeholder="Enter student name..."
                                    value={studentNameFilter}
                                    onChange={(e) => {
                                        setStudentNameFilter(e.target.value);
                                        setStudentPage(1);
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Course
                                </label>
                                <Select
                                    value={studentCourseFilter}
                                    onValueChange={(value) => {
                                        setStudentCourseFilter(value);
                                        setStudentPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All courses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All courses</SelectItem>
                                        {courses.map((course: any) => (
                                            <SelectItem key={course.slug} value={course.slug}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {renderTable(studentsData, studentsLoading, studentPage, setStudentPage, "student")}
                    </CardContent>
                </Card>
            )}

            {/* Teachers Tab */}
            {activeTab === "teachers" && (
                <Card>
                    <CardContent className="pt-6">
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Search className="inline h-4 w-4 mr-1" />
                                    Search by Name or Email
                                </label>
                                <Input
                                    placeholder="Enter name or email..."
                                    value={teacherNameFilter}
                                    onChange={(e) => {
                                        setTeacherNameFilter(e.target.value);
                                        setTeacherPage(1);
                                    }}
                                />
                            </div>
                        </div>

                        {renderTable(teachersData, teachersLoading, teacherPage, setTeacherPage, "teacher")}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default LastLoginsComponent;
