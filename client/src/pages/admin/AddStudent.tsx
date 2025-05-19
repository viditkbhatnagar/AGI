// client/src/pages/admin/AddStudent.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CourseOption {
  slug: string;
  title: string;
}

export default function AddStudent() {
  const [, setLocation] = useLocation();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    dob: '',
    pathway: 'standalone',
    courseSlug: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available courses for the dropdown
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/students', {
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
      // Redirect back to student list
      setLocation('/admin/students');
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add New Student</h1>

      <Card>
        <CardContent>
          {error && (
            <div className="mb-4 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Password</label>
                <Input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Full Name</label>
                <Input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Address</label>
                <Input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Birth</label>
                <Input
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Pathway</label>
                <select
                  name="pathway"
                  value={form.pathway}
                  onChange={handleChange}
                  className="block w-full border rounded px-3 py-2"
                >
                  <option value="standalone">Standalone</option>
                  <option value="with-mba">With MBA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Course</label>
                {loadingCourses ? (
                  <p>Loading courses…</p>
                ) : (
                  <select
                    name="courseSlug"
                    required
                    value={form.courseSlug}
                    onChange={handleChange}
                    className="block w-full border rounded px-3 py-2"
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Add Student'}
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
    </div>
  );
}