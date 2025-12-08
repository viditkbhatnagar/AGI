import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import GlassCard from "@/components/admin/ui/glass-card";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Radio,
  Users,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

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
  const prefersReducedMotion = useReducedMotion();
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
    courseSlug: "",
    studentIds: [] as string[],
    meetLink: "",
  });
  const [sessions, setSessions] = useState([
    {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      moduleIndex: -1,
    },
  ]);

  const [studentFilter, setStudentFilter] = useState<string>("");

  // Fetch courses & students for the dropdowns
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const [coursesRes, studentsRes] = await Promise.all([
          fetch("/api/admin/courses", {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          }),
          fetch("/api/admin/students", {
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
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/courses/${form.courseSlug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error("Failed to fetch course");
        }
        const course = await res.json();
        const moduleOptions: ModuleOption[] = course.modules.map((module: any, index: number) => ({
          index,
          title: module.title
        }));
        setModules(moduleOptions);
      } catch (err) {
        console.error("Error fetching course modules:", err);
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
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/enrollments/course/${form.courseSlug}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
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
    if (name === "studentIds") {
      const selected: string[] = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selected.push(options[i].value);
        }
      }
      setForm((prev) => ({ ...prev, studentIds: selected }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSessionChange = (index: number, field: string, value: string) => {
    setSessions((prev) => {
      const copy = [...prev];
      if (field === "moduleIndex") {
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
      const token = localStorage.getItem("token");
      for (const sess of sessions) {
        // Convert datetime-local strings to ISO strings (UTC)
        const startTime = sess.startTime
          ? new Date(sess.startTime).toISOString()
          : "";
        const endTime = sess.endTime ? new Date(sess.endTime).toISOString() : "";

        const payload = {
          ...form,
          title: sess.title,
          description: sess.description,
          meetLink: form.meetLink,
          startTime,
          endTime,
          studentIds: form.studentIds,
          moduleIndex: sess.moduleIndex,
        };
        const res = await fetch("/api/live-classes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || `Error ${res.status}`);
        }
      }
      setLocation("/admin/live-classes");
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-white">Loading…</div>
      </AdminLayout>
    );
  }

  const heroVariants = {
    hidden: prefersReducedMotion ? {} : { opacity: 0, y: 12 },
    visible: prefersReducedMotion
      ? {}
      : {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
  };

  const cardVariants = {
    hidden: prefersReducedMotion ? {} : { opacity: 0, y: 16 },
    visible: prefersReducedMotion
      ? {}
      : {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] },
        },
  };

  const courseCount = courses.length;
  const studentCount = availableStudents.length;

  return (
    <AdminLayout>
      <Helmet>
        <title>Schedule Live Class | AGI Admin</title>
        <meta
          name="description"
          content="Schedule live classes, assign cohorts, and manage sessions."
        />
      </Helmet>

      <div className="p-4 md:p-6 space-y-6">
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-200/60">
              <CalendarClock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Live Delivery</p>
              <h1 className="text-3xl font-semibold text-gray-900">
                SCHEDULE LIVE CLASS
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select a course, pick your learners, and plan sessions with ease.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                  <Radio className="h-4 w-4 mr-1" /> Live cohorts
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">
                  <Sparkles className="h-4 w-4 mr-1" /> Guided flow
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                  <Users className="h-4 w-4 mr-1" /> Student-ready
                </Badge>
              </div>
            </div>
          </div>

          <GlassCard
            variant="default"
            className="min-w-[260px] bg-white/95 text-left"
            animationDelay={0.08}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-xl font-semibold text-gray-900">
                  {saving ? "Scheduling…" : "Ready"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {courseCount} courses • {studentCount} students
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <GlassCard
            variant="elevated"
            className="bg-white/98 border-white/30 shadow-xl"
            animationDelay={0.12}
          >
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="space-y-4 xl:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassCard variant="default" className="bg-white">
                      <div className="space-y-2">
                        <Label className="text-gray-700">Course</Label>
                        <select
                          name="courseSlug"
                          required
                          className="mt-1 block w-full px-3 py-2 h-11 border rounded-md bg-white text-gray-900"
                          value={form.courseSlug}
                          onChange={handleChange}
                        >
                          <option value="">Select a course</option>
                          {courses.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500">
                          Load modules and enrolled learners for the selected course.
                        </p>
                      </div>
                    </GlassCard>

                    <GlassCard variant="default" className="bg-white">
                      <div className="space-y-2">
                        <Label className="text-gray-700">Meeting Link</Label>
                        <Input
                          name="meetLink"
                          required
                          value={form.meetLink}
                          onChange={handleChange}
                          placeholder="https://meet.example.com/..."
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">
                          Paste the live class meeting URL your learners will join.
                        </p>
                      </div>
                    </GlassCard>
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isBulk}
                      onChange={(e) => setIsBulk(e.target.checked)}
                      id="bulkToggle"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Label htmlFor="bulkToggle" className="text-sm text-gray-700">
                      Bulk scheduling (add multiple sessions)
                    </Label>
                  </div>

                  <div className="space-y-5">
                    {sessions.map((sess, idx) => (
                      <GlassCard
                        key={idx}
                        variant="default"
                        className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-100"
                        glow
                        glowColor="brand"
                        animationDelay={0.16 + idx * 0.04}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white/80 text-blue-800 border-blue-200">
                              Session {idx + 1}
                            </Badge>
                            <span className="text-sm text-gray-900">
                              Define timing and module
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-900">Module</Label>
                            <select
                              name="moduleIndex"
                              required
                              className="mt-1 block w-full px-3 py-2 h-11 border rounded-md bg-white text-gray-900"
                              value={sess.moduleIndex}
                              onChange={(e) =>
                                handleSessionChange(idx, "moduleIndex", e.target.value)
                              }
                              disabled={!form.courseSlug || modules.length === 0}
                            >
                              <option value={-1}>Select a module</option>
                              {modules.map((m) => (
                                <option key={m.index} value={m.index}>
                                  Module {m.index + 1}: {m.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-gray-900">Title</Label>
                            <Input
                              name="title"
                              required
                              placeholder="Session Title"
                              value={sess.title}
                              onChange={(e) =>
                                handleSessionChange(idx, "title", e.target.value)
                              }
                              className="h-11 text-gray-900 placeholder:text-gray-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-900">Description</Label>
                          <Textarea
                            name="description"
                            rows={2}
                            placeholder="Session Description"
                            value={sess.description}
                            onChange={(e) =>
                              handleSessionChange(idx, "description", e.target.value)
                            }
                            className="text-gray-900 placeholder:text-gray-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-900">Start Time</Label>
                            <Input
                              name="startTime"
                              type="datetime-local"
                              required
                              value={sess.startTime}
                              onChange={(e) =>
                                handleSessionChange(idx, "startTime", e.target.value)
                              }
                              className="h-11 text-gray-900 placeholder:text-gray-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-900">End Time</Label>
                            <Input
                              name="endTime"
                              type="datetime-local"
                              required
                              value={sess.endTime}
                              onChange={(e) =>
                                handleSessionChange(idx, "endTime", e.target.value)
                              }
                              className="h-11 text-gray-900 placeholder:text-gray-500"
                            />
                          </div>
                        </div>
                      </GlassCard>
                    ))}

                    {isBulk && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() =>
                          setSessions((prev) => [
                            ...prev,
                            { title: "", description: "", startTime: "", endTime: "", moduleIndex: -1 },
                          ])
                        }
                        className="inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Session
                      </Button>
                    )}
                  </div>
                </div>

                <GlassCard
                  variant="default"
                  className="bg-white/98"
                  animationDelay={0.18}
                >
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      Students
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-800"
                        value={studentFilter}
                        onChange={(e) => setStudentFilter(e.target.value)}
                      >
                        <option value="">All students</option>
                        {availableStudents.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const filteredIds = availableStudents
                            .filter((s) =>
                              studentFilter ? s.name === studentFilter : true
                            )
                            .map((s) => s.id);
                          setForm((prev) => ({ ...prev, studentIds: filteredIds }));
                        }}
                      >
                        Select All
                      </Button>
                    </div>
                    <ScrollArea className="h-64 rounded-xl border border-gray-200 bg-white shadow-inner p-3">
                      <div className="space-y-2">
                        {availableStudents
                          .filter((s) =>
                            studentFilter ? s.name === studentFilter : true
                          )
                          .map((s) => (
                            <label
                              key={s.id}
                              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  value={s.id}
                                  checked={form.studentIds.includes(s.id)}
                                  onChange={(e) => {
                                    const { value, checked } = e.target;
                                    setForm((prev) => {
                                      const studentIds = checked
                                        ? [...prev.studentIds, value]
                                        : prev.studentIds.filter((id) => id !== value);
                                      return { ...prev, studentIds };
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-800">{s.name}</span>
                              </div>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-gray-500">
                      Select multiple learners to enroll them into this live class.
                    </p>
                  </div>
                </GlassCard>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin/live-classes")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Scheduling…" : "Schedule"}
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </AdminLayout>
  );
}