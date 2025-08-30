import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
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

interface ModuleOption {
  index: number;
  title: string;
}

export default function ScheduleLiveClass() {
  const [, setLocation] = useLocation();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBulk, setIsBulk] = useState(false);

  // Form state
  const [form, setForm] = useState({
    courseSlug: '',
    studentIds: [] as string[],
    meetLink: ''
  });
  const [sessions, setSessions] = useState([
    {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      moduleIndex: -1
    }
  ]);

  const [studentSearch, setStudentSearch] = useState<string>('');

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
        setAllStudents(studentOpts);
        setAvailableStudents(studentOpts);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch modules when course is selected
  useEffect(() => {
    if (!form.courseSlug) {
      setModules([]);
      return;
    }
    
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/courses/${form.courseSlug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error('Failed to fetch course');
        }
        const course = await res.json();
        const moduleOptions: ModuleOption[] = course.modules.map((module: any, index: number) => ({
          index,
          title: module.title
        }));
        setModules(moduleOptions);
      } catch (err) {
        console.error('Error fetching course modules:', err);
        setModules([]);
      }
    })();
  }, [form.courseSlug]);

  useEffect(() => {
    if (!form.courseSlug) {
      setAvailableStudents(allStudents);
      return;
    }
    (async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/enrollments/course/${form.courseSlug}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) {
        setAvailableStudents([]);
        return;
      }
      const enrolls: any[] = await res.json();
      const opts: StudentOption[] = enrolls
        .map(e => {
          const s = e.studentId;
          return s ? { id: s._id, name: s.name } : null;
        })
        .filter((x): x is StudentOption => !!x);
      setAvailableStudents(opts);
    })();
  }, [form.courseSlug, allStudents]);

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

  const handleSessionChange = (index: number, field: string, value: string) => {
    setSessions(prev => {
      const copy = [...prev];
      if (field === 'moduleIndex') {
        (copy[index] as any)[field] = parseInt(value);
      } else {
        (copy[index] as any)[field] = value;
      }
      return copy;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    // Validate module selection for each session
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].moduleIndex < 0) {
        setError(`Please select a module for Session ${i + 1}`);
        setSaving(false);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      for (const sess of sessions) {
        // Convert datetime-local strings to ISO strings (UTC)
        const startTime = sess.startTime ? new Date(sess.startTime).toISOString() : '';
        const endTime = sess.endTime ? new Date(sess.endTime).toISOString() : '';
        
        const payload = {
          ...form,
          title: sess.title,
          description: sess.description,
          meetLink: form.meetLink,
          startTime,
          endTime,
          studentIds: form.studentIds,
          moduleIndex: sess.moduleIndex
        };
        const res = await fetch('/api/live-classes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || `Error ${res.status}`);
        }
      }
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

              {/* Student selection with search and checkboxes */}
              <div>
                <label className="block text-sm font-medium">Students</label>
                <div className="mt-1 flex items-center space-x-2">
                  <Input
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredIds = availableStudents
                        .filter(s =>
                          s.name.toLowerCase().includes(studentSearch.toLowerCase())
                        )
                        .map(s => s.id);
                      setForm(prev => ({ ...prev, studentIds: filteredIds }));
                    }}
                  >
                    Select All
                  </Button>
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2">
                  {availableStudents
                    .filter(s =>
                      s.name.toLowerCase().includes(studentSearch.toLowerCase())
                    )
                    .map(s => (
                      <label key={s.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          value={s.id}
                          checked={form.studentIds.includes(s.id)}
                          onChange={e => {
                            const { value, checked } = e.target;
                            setForm(prev => {
                              const studentIds = checked
                                ? [...prev.studentIds, value]
                                : prev.studentIds.filter(id => id !== value);
                              return { ...prev, studentIds };
                            });
                          }}
                          className="mr-2"
                        />
                        {s.name}
                      </label>
                    ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isBulk}
                    onChange={e => setIsBulk(e.target.checked)}
                    id="bulkToggle"
                    className="h-4 w-4"
                  />
                  <label htmlFor="bulkToggle" className="text-sm font-medium">Bulk Scheduling</label>
                </div>
                <div className="space-y-6 mt-4">
                  {sessions.map((sess, idx) => (
                    <div key={idx} className="space-y-4 border p-4 rounded">
                      <h3 className="font-bold">Session {idx + 1}</h3>
                      
                      {/* Module selection for this session */}
                      <div>
                        <label className="block text-sm font-medium">Module</label>
                        <select
                          name="moduleIndex"
                          required
                          className="mt-1 block w-full px-3 py-2 border rounded-md bg-white"
                          value={sess.moduleIndex}
                          onChange={(e) => handleSessionChange(idx, 'moduleIndex', e.target.value)}
                          disabled={!form.courseSlug || modules.length === 0}
                        >
                          <option value={-1}>Select a module</option>
                          {modules.map(m => (
                            <option key={m.index} value={m.index}>
                              Module {m.index + 1}: {m.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <Input
                        label="Title"
                        name="title"
                        required
                        placeholder="Session Title"
                        value={sess.title}
                        onChange={(e) => handleSessionChange(idx, 'title', e.target.value)}
                      />
                      <textarea
                        name="description"
                        rows={2}
                        className="block w-full px-3 py-2 border rounded-md"
                        placeholder="Session Description"
                        value={sess.description}
                        onChange={(e) => handleSessionChange(idx, 'description', e.target.value)}
                      />
                      <Input
                        label="Start Time"
                        name="startTime"
                        type="datetime-local"
                        required
                        value={sess.startTime}
                        onChange={(e) => handleSessionChange(idx, 'startTime', e.target.value)}
                      />
                      <Input
                        label="End Time"
                        name="endTime"
                        type="datetime-local"
                        required
                        value={sess.endTime}
                        onChange={(e) => handleSessionChange(idx, 'endTime', e.target.value)}
                      />
                    </div>
                  ))}
                  {isBulk && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setSessions(prev => [...prev, { title:'', description:'', startTime:'', endTime:'', moduleIndex: -1 }])}
                    >
                      + Add Session
                    </Button>
                  )}
                </div>
              </div>

              {/* Meeting Link */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Meeting Link</label>
                <Input
                  name="meetLink"
                  required
                  value={form.meetLink}
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