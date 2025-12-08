import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GlassCard from "@/components/admin/ui/glass-card";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  UserPlus,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  CalendarClock,
  RefreshCw,
  Search,
} from "lucide-react";

interface CourseOption {
  slug: string;
  title: string;
}

export default function AddStudent() {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [form, setForm] = useState<{
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    dob: string;
    pathway: string;
    courseSlugs: string[];
  }>({
    email: "",
    password: "",
    name: "",
    phone: "",
    address: "",
    dob: "",
    pathway: "standalone",
    courseSlugs: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState("");

  // Fetch available courses for the dropdown
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/admin/courses", {
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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    if (name === 'courseSlugs') {
      const select = e.target as HTMLSelectElement;
      const values = Array.from(select.selectedOptions).map(
        (o) => o.value
      );
      setForm((prev) => ({ ...prev, courseSlugs: values }));
    } else {
      const { value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Error ${res.status}`);
      }
      // Redirect back to student list
      setLocation("/admin/students");
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pwd }));
  };

  const handleCourseCheckboxChange = (slug: string, checked: boolean | string) => {
    const isChecked = checked === true;
    setForm((prev) => {
      const courseSlugs = isChecked
        ? [...prev.courseSlugs, slug]
        : prev.courseSlugs.filter((s) => s !== slug);
      return { ...prev, courseSlugs };
    });
  };

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

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      <Helmet>
        <title>Add Student | AGI Admin</title>
        <meta
          name="description"
          content="Onboard new learners with a polished, guided enrollment flow."
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
              <UserPlus className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Enrollment Ops</p>
              <h1 className="text-3xl font-semibold text-gray-900">
                ADD STUDENT
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Capture essentials, assign pathways, and enroll into curated courses.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                  <ShieldCheck className="h-4 w-4 mr-1" /> Secure onboarding
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">
                  <Sparkles className="h-4 w-4 mr-1" /> Modern UI
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                  <CalendarClock className="h-4 w-4 mr-1" /> Quick assignment
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
                  {saving ? "Saving…" : "Ready"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {loadingCourses
                    ? "Loading catalog"
                    : `${courses.length} courses available`}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700">Full Name</Label>
                      <Input
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">Phone</Label>
                      <Input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">Email</Label>
                      <Input
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="name@domain.com"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">Date of Birth</Label>
                      <Input
                        name="dob"
                        type="date"
                        value={form.dob}
                        onChange={handleChange}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-700">Address</Label>
                      <Input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Street, City, Country"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700">Password</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          name="password"
                          type="text"
                          required
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Generate a secure password"
                          className="h-11"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleGeneratePassword}
                          className="shrink-0"
                        >
                          Generate
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Use strong passwords to keep student accounts safe.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700">Pathway</Label>
                      <Select
                        value={form.pathway}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, pathway: value }))
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select pathway" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standalone">Standalone</SelectItem>
                          <SelectItem value="with-mba">With MBA</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Align the program to the learner’s intent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      Courses
                    </Label>
                    {loadingCourses ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-600">
                        Loading courses…
                      </div>
                    ) : (
                      <>
                        <Input
                          type="text"
                          placeholder="Search courses"
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                          className="h-11"
                        />
                        <ScrollArea className="h-64 rounded-xl border border-gray-200 bg-white shadow-inner p-3">
                          <div className="space-y-2">
                            {filteredCourses.length === 0 && (
                              <p className="text-sm text-gray-500">
                                No courses match that search.
                              </p>
                            )}
                            {filteredCourses.map((c) => (
                              <label
                                key={c.slug}
                                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                    checked={form.courseSlugs.includes(c.slug)}
                                    onChange={(e) =>
                                      handleCourseCheckboxChange(c.slug, e.target.checked)
                                    }
                                  />
                                  <span className="text-sm text-gray-800">{c.title}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                        <p className="text-xs text-gray-500">
                          Select multiple courses to enroll the student instantly.
                        </p>
                      </>
                    )}
                  </div>

                  <GlassCard
                    variant="default"
                    className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-100"
                    glow
                    glowColor="brand"
                    animationDelay={0.18}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">Enrollment tips</p>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          <li>Assign at least one core course.</li>
                          <li>Use “With MBA” pathway for dual-track learners.</li>
                          <li>Generate a secure password before saving.</li>
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin/students")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Add Student"}
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </AdminLayout>
  );
}