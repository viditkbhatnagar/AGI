import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus, Search, SlidersHorizontal, Trash2, Users, School, CalendarClock } from "lucide-react";
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

export function Courses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/courses'],
  });
  
  const filteredCourses = data?.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (isLoading) {
    return <CoursesSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Courses</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading courses data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Courses</h1>
        <div className="mt-2 md:mt-0">
          <Button onClick={() => setLocation("/admin/courses/new")}>
            <School className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search courses..."
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
                    <School className="mr-2 h-4 w-4" />
                    Add Course
                  </DropdownMenuItem>
                  <DropdownMenuItem>Import Course</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Bulk Edit</DropdownMenuItem>
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
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Avg. Completion</TableHead>
                <TableHead>Live Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses?.length > 0 ? (
                filteredCourses.map((course) => (
                  <TableRow key={course._id || course.slug}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{course.title}</div>
                        <Badge variant="outline" className="ml-2 text-xs">{course.slug}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        course.type === 'with-mba' 
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                          : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                      }>
                        {course.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          {/* This would come from the backend */}
                          {Math.floor(Math.random() * 20) + 1} students
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-gray-900 mb-1">
                          {/* This would come from the backend */}
                          {Math.floor(Math.random() * 100)}%
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.liveClassConfig?.enabled ? "outline" : "secondary"} className={
                        course.liveClassConfig?.enabled 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }>
                        {course.liveClassConfig?.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/courses/${course.slug}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/courses/${course.slug}/edit`)}>
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
                        <p className="text-gray-500">No courses match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <School className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No courses found. Add your first course to get started.</p>
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

function CoursesSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32 mt-2 md:mt-0" />
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
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-24 mx-4" />
                <Skeleton className="h-4 w-24 mx-4" />
                <div className="mx-4 w-32">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-6 w-16 mx-4" />
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

export default Courses;
