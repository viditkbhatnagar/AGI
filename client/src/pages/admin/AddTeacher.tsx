import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Helmet } from "react-helmet-async";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConditionalRender } from '@/lib/permissions-provider';

interface CourseOption {
  slug: string;
  title: string;
}

interface Teacher {
  _id: string;
  username: string;
  email: string;
  accessEnabled: boolean;
  createdAt: string;
  assignedCourses: string[];
  studentCount: number;
  phone?: string;
  address?: string;
}

interface TeacherAssignment {
  _id: string;
  teacherId: {
    _id: string;
    username: string;
    email: string;
  };
  courseSlug: string;
  assignedAt: string;
  assignedBy: {
    username: string;
  };
}

function AddTeacherPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canCreate, isSuperAdmin } = useConditionalRender();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [form, setForm] = useState<{
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    courseSlugs: string[];
  }>({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    courseSlugs: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState('');
  
  // Teacher list state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  
  // Edit teacher state
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    address: string;
    courseSlugs: string[];
  }>({
    name: '',
    phone: '',
    address: '',
    courseSlugs: []
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCourseSearch, setEditCourseSearch] = useState('');

  // Fetch available courses for assignment
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/courses', {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined
        });
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data: CourseOption[] = await res.json();
        setCourses(data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, []);

  // Fetch teachers and their assignments
  useEffect(() => {
    const fetchTeachersData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch all teachers with enhanced data
        const teachersRes = await fetch('/api/admin/teachers', {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined
        });
        
        if (!teachersRes.ok) {
          throw new Error(`Error ${teachersRes.status}: ${teachersRes.statusText}`);
        }
        
        const teachersData: Teacher[] = await teachersRes.json();
        setTeachers(teachersData);
        
        // Fetch all teacher assignments (for backward compatibility)
        const assignmentsRes = await fetch('/api/admin/teacher-assignments', {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined
        });
        
        if (!assignmentsRes.ok) {
          throw new Error(`Error ${assignmentsRes.status}: ${assignmentsRes.statusText}`);
        }
        
        const assignmentsData: TeacherAssignment[] = await assignmentsRes.json();
        setTeacherAssignments(assignmentsData);
      } catch (err) {
        console.error('Error fetching teachers data:', err);
        setError((err as Error).message);
      } finally {
        setLoadingTeachers(false);
      }
    };
    
    fetchTeachersData();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (form.courseSlugs.length === 0) {
      setError('Please assign at least one course to the teacher');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Error ${res.status}`);
      }
      
      // Refresh the teacher list after successful creation
      const tokenRefresh = localStorage.getItem('token');
      
      // Fetch all teachers
      const teachersRes = await fetch('/api/admin/teachers', {
        headers: tokenRefresh
          ? { Authorization: `Bearer ${tokenRefresh}` }
          : undefined
      });
      
      if (teachersRes.ok) {
        const teachersData: Teacher[] = await teachersRes.json();
        setTeachers(teachersData);
      }
      
      // Reset form
      setForm({
        email: '',
        password: '',
        name: '',
        phone: '',
        address: '',
        courseSlugs: []
      });
      
      toast({
        title: "Success",
        description: "Teacher created successfully",
      });
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: pwd }));
  };

  const handleCourseCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setForm(prev => {
      const courseSlugs = checked
        ? [...prev.courseSlugs, value]
        : prev.courseSlugs.filter(slug => slug !== value);
      return { ...prev, courseSlugs };
    });
  };

  const handleEditCourseCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setEditForm(prev => {
      const courseSlugs = checked
        ? [...prev.courseSlugs, value]
        : prev.courseSlugs.filter(slug => slug !== value);
      return { ...prev, courseSlugs };
    });
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditForm({
      name: teacher.username || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      courseSlugs: teacher.assignedCourses || []
    });
    setEditCourseSearch('');
    setEditError(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!editingTeacher) return;
    
    if (editForm.courseSlugs.length === 0) {
      setEditError('Please assign at least one course to the teacher');
      return;
    }
    
    setEditSaving(true);
    setEditError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Update teacher details (name, phone, address)
      const updateData = {
        username: editForm.name,
        phone: editForm.phone,
        address: editForm.address
      };
      
      const updateRes = await fetch(`/api/admin/teachers/${editingTeacher._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(updateData)
      });
      
      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.message || `Error ${updateRes.status}`);
      }
      
      // Update course assignments
      // First, remove all current assignments for this teacher
      const currentAssignments = teacherAssignments.filter(
        assignment => assignment.teacherId._id === editingTeacher._id
      );
      
      // Delete current assignments
      for (const assignment of currentAssignments) {
        await fetch(`/api/admin/teacher-assignments`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({
            teacherId: editingTeacher._id,
            courseSlug: assignment.courseSlug
          })
        });
      }
      
      // Add new assignments
      for (const courseSlug of editForm.courseSlugs) {
        await fetch(`/api/admin/teacher-assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({
            teacherId: editingTeacher._id,
            courseSlug
          })
        });
      }
      
      // Refresh the teacher list
      const tokenRefresh = localStorage.getItem('token');
      
      // Fetch all teachers
      const teachersRes = await fetch('/api/admin/teachers', {
        headers: tokenRefresh
          ? { Authorization: `Bearer ${tokenRefresh}` }
          : undefined
      });
      
      if (teachersRes.ok) {
        const teachersData: Teacher[] = await teachersRes.json();
        setTeachers(teachersData);
      }
      
      // Fetch all teacher assignments
      const assignmentsRes = await fetch('/api/admin/teacher-assignments', {
        headers: tokenRefresh
          ? { Authorization: `Bearer ${tokenRefresh}` }
          : undefined
      });
      
      if (assignmentsRes.ok) {
        const assignmentsData: TeacherAssignment[] = await assignmentsRes.json();
        setTeacherAssignments(assignmentsData);
      }
      
      setEditingTeacher(null);
      toast({
        title: "Success",
        description: "Teacher updated successfully",
      });
    } catch (err) {
      console.error(err);
      setEditError((err as Error).message);
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!window.confirm(`Are you sure you want to delete teacher ${teacherName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Error ${res.status}`);
      }
      
      // Refresh the teacher list
      const tokenRefresh = localStorage.getItem('token');
      
      // Fetch all teachers
      const teachersRes = await fetch('/api/admin/teachers', {
        headers: tokenRefresh
          ? { Authorization: `Bearer ${tokenRefresh}` }
          : undefined
      });
      
      if (teachersRes.ok) {
        const teachersData: Teacher[] = await teachersRes.json();
        setTeachers(teachersData);
      }
      
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">{isSuperAdmin ? 'Teachers Management' : 'Add New Teacher'}</h1>

      {canCreate && (
        <Card>
        <CardHeader>
          <CardTitle>Teacher Information</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <Input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter teacher's full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <Input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter teacher's email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <Input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Password *</label>
                <div className="flex space-x-2 items-center">
                  <Input
                    name="password"
                    type="text"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password or generate one"
                  />
                  <Button type="button" onClick={handleGeneratePassword} variant="outline">
                    Generate
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Assign Courses *</label>
                {loadingCourses ? (
                  <p className="text-gray-500">Loading courses…</p>
                ) : (
                  <>
                    <Input
                      type="text"
                      placeholder="Search courses to assign"
                      value={courseSearch}
                      onChange={e => setCourseSearch(e.target.value)}
                      className="mb-3"
                    />
                    <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                      {courses
                        .filter(c =>
                          c.title.toLowerCase().includes(courseSearch.toLowerCase())
                        )
                        .map(c => (
                          <label key={c.slug} className="flex items-center mb-2 last:mb-0">
                            <input
                              type="checkbox"
                              name="courseSlugs"
                              value={c.slug}
                              checked={form.courseSlugs.includes(c.slug)}
                              onChange={handleCourseCheckboxChange}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm">{c.title}</span>
                          </label>
                        ))}
                    </div>
                    {form.courseSlugs.length > 0 && (
                      <p className="text-sm text-green-600 mt-2">
                        Selected {form.courseSlugs.length} course(s)
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button type="submit" disabled={saving || loadingCourses}>
                {saving ? 'Creating Teacher…' : 'Create Teacher'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/admin/students')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      {/* Teacher List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTeachers ? (
            <p className="text-gray-500">Loading teachers...</p>
          ) : teachers.length === 0 ? (
            <p className="text-gray-500">No teachers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Courses</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell className="font-medium">{teacher.username}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <Badge variant={teacher.accessEnabled ? "default" : "secondary"}>
                          {teacher.accessEnabled ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {teacher.assignedCourses && teacher.assignedCourses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.assignedCourses.map((course, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {course}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">No courses assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{teacher.studentCount || 0} students</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(teacher.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(teacher)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTeacher(teacher._id, teacher.username)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Teacher Dialog */}
      <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          
          {editingTeacher && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {editError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600">{editError}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    name="name"
                    required
                    value={editForm.name}
                    onChange={handleEditChange}
                    placeholder="Enter teacher's full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    name="email"
                    type="email"
                    disabled
                    value={editingTeacher.email}
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                    placeholder="Enter address"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Assign Courses *</label>
                  <Input
                    type="text"
                    placeholder="Search courses to assign"
                    value={editCourseSearch}
                    onChange={e => setEditCourseSearch(e.target.value)}
                    className="mb-3"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    {courses
                      .filter(c =>
                        c.title.toLowerCase().includes(editCourseSearch.toLowerCase())
                      )
                      .map(c => (
                        <label key={c.slug} className="flex items-center mb-2 last:mb-0">
                          <input
                            type="checkbox"
                            name="courseSlugs"
                            value={c.slug}
                            checked={editForm.courseSlugs.includes(c.slug)}
                            onChange={handleEditCourseCheckboxChange}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm">{c.title}</span>
                        </label>
                      ))}
                  </div>
                  {editForm.courseSlugs.length > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected {editForm.courseSlugs.length} course(s)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTeacher(null)}
                  disabled={editSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? 'Updating Teacher…' : 'Update Teacher'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AddTeacher() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Add Teacher | AGI.online</title>
        <meta name="description" content="Create a new teacher account and assign courses." />
      </Helmet>
      <AddTeacherPage />
    </DashboardLayout>
  );
}