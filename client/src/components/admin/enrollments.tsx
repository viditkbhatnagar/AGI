import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, GraduationCap, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatTimeRemaining, getInitials } from "@/lib/utils";

export function Enrollments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/enrollments'],
  });
  
  const filteredEnrollments = data?.filter(enrollment => 
    enrollment.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enrollment.courseSlug.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (isLoading) {
    return <EnrollmentsSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Enrollments</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading enrollments data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Enrollments</h1>
        <div className="mt-2 md:mt-0">
          <Button onClick={() => setLocation("/admin/enrollments/new")}>
            <GraduationCap className="mr-2 h-4 w-4" />
            Create Enrollment
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search enrollments..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Create Enrollment
                  </DropdownMenuItem>
                  <DropdownMenuItem>Bulk Enroll Students</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Generate Reports</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments?.length > 0 ? (
                filteredEnrollments.map((enrollment) => (
                  <TableRow key={enrollment._id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="font-medium text-primary-700">
                            {getInitials(enrollment.studentId?.name || "Student")}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{enrollment.studentId?.name || "Unknown Student"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">{enrollment.courseSlug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">{formatDate(enrollment.enrollDate)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">{formatDate(enrollment.validUntil)}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(enrollment.validUntil) > new Date() 
                          ? formatTimeRemaining(enrollment.validUntil) + " remaining"
                          : "Expired"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-gray-900 mb-1">
                          {enrollment.completedModules?.length > 0 
                            ? `${Math.round((enrollment.completedModules.filter(m => m.completed).length / 
                              enrollment.completedModules.length) * 100)}% Complete`
                            : "Not started"}
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ 
                              width: enrollment.completedModules?.length > 0 
                                ? `${Math.round((enrollment.completedModules.filter(m => m.completed).length / 
                                  enrollment.completedModules.length) * 100)}%`
                                : "0%"
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/enrollments/${enrollment._id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/enrollments/${enrollment._id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No enrollments match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <GraduationCap className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No enrollments found. Create your first enrollment to get started.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function EnrollmentsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-40 mt-2 md:mt-0" />
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Skeleton className="h-10 w-full md:w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="p-1">
          <div className="rounded-md border">
            <div className="h-10 px-4 border-b flex items-center bg-gray-50">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-24 mx-4" />
              ))}
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center px-4 py-4 border-b last:border-0">
                <div className="flex items-center flex-1">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-4">
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-32 mx-4" />
                <Skeleton className="h-4 w-24 mx-4" />
                <div className="mx-4 w-32">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="mx-4 w-32">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="flex justify-end gap-2 ml-4">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Enrollments;
