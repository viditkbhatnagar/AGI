// client/src/pages/admin/ScheduleLiveClass.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CourseOption {
  slug: string;
  title: string;
}

interface StudentOption {
  id: string;
  name: string;
}

export default function ScheduleLiveClass() {
  const [, setLocation] = useLocation();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    courseSlug: '',
    studentIds: [] as string[],
    title: '',
    description: '',
    meetLink: '',
    startTime: '',
    endTime: ''
  });

  // Fetch courses & students for the dropdowns
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const [coursesRes, studentsRes] = await Promise.all([
          fetch('/api/admin/courses', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          }),
          fetch('/api/admin/students', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          })
        ]);

        if (!coursesRes.ok) throw new Error(`Error ${coursesRes.status}`);
        if (!studentsRes.ok) throw new Error(`Error ${studentsRes.status}`);

        const coursesData: CourseOption[] = await coursesRes.json();
        const studentsData: any[] = await studentsRes.json();
        const studentOpts: StudentOption[] = studentsData.map(s => ({
          id: s.id || s._id,
          name: s.name
        }));

        setCourses(coursesData);
        setStudents(studentOpts);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, options } = e.target as HTMLSelectElement;
    if (name === 'studentIds') {
      const selected: string[] = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selected.push(options[i].value);
        }
      }
      setForm(prev => ({ ...prev, studentIds: selected }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/live-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || `Error ${res.status}`);
      }
      // On success, redirect back to admin live classes list
      setLocation('/admin/live-classes');
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6">Loading…</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Schedule Live Class</h1>
      <Card>
        <CardContent>
          {error && <div className="mb-4 text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Course dropdown */}
              <div>
                <label className="block text-sm font-medium">Course</label>
                <select
                  name="courseSlug"
                  required
                  className="mt-1 block w-full px-3 py-2 border rounded-md bg-white"
                  value={form.courseSlug}
                  onChange={handleChange}
                >
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student multi-select */}
              <div>
                <label className="block text-sm font-medium">Students</label>
                <select
                  name="studentIds"
                  multiple
                  required
                  className="mt-1 block w-full h-32 px-3 py-2 border rounded-md bg-white"
                  value={form.studentIds}
                  onChange={handleChange}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium">Title</label>
                <Input
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                />
              </div>

              {/* Meeting Link */}
              <div>
                <label className="block text-sm font-medium">Meeting Link</label>
                <Input
                  name="meetLink"
                  required
                  value={form.meetLink}
                  onChange={handleChange}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border rounded-md bg-white"
                  value={form.description}
                  onChange={handleChange as any}
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium">Start Time</label>
                <Input
                  name="startTime"
                  type="datetime-local"
                  required
                  value={form.startTime}
                  onChange={handleChange}
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium">End Time</label>
                <Input
                  name="endTime"
                  type="datetime-local"
                  required
                  value={form.endTime}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Scheduling…' : 'Schedule'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/admin/live-classes')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}