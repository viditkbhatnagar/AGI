import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  GripVertical,
  ArrowUp,
  ArrowDown,
  FileText,
  Video
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from "@/hooks/use-toast";

interface Module {
  _id?: string;
  title: string;
  videos: Array<{ title: string; duration: number; url: string }>;
  documents: Array<{ title: string; url: string }>;
}

interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  modules: Module[];
  liveClassConfig: {
    enabled: boolean;
    frequency: string;
    dayOfWeek: string;
    durationMin: number;
  };
}

function SortableModuleItem({ module, index, isDisabled = false }: { module: Module; index: number; isDisabled?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module._id || `module-${index}`,
    disabled: isDisabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 mb-3 ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div
            {...(isDisabled ? {} : attributes)}
            {...(isDisabled ? {} : listeners)}
            className={`p-1 rounded ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:cursor-grabbing hover:bg-gray-100'}`}
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="text-xs">
                Module {index + 1}
              </Badge>
              <h3 className="font-semibold text-gray-900">{module.title}</h3>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Video className="h-4 w-4" />
                <span>{module.videos?.length || 0} videos</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>{module.documents?.length || 0} documents</span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

export default function CourseEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [courseData, setCourseData] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: course, isLoading, error } = useQuery({
    queryKey: [`/api/courses/${slug}`],
    enabled: !!slug,
  });

  // Initialize local state when course data loads
  useEffect(() => {
    if (course) {
      setCourseData(course);
      setModules(course.modules || []);
    }
  }, [course]);

  const updateModuleOrderMutation = useMutation({
    mutationFn: async (newModules: Module[]) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses/${slug}/reorder-modules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ modules: newModules }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update module order');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update local state immediately
      if (courseData && data.course) {
        setCourseData(data.course);
        setModules(data.course.modules || []);
      }

      // Clear unsaved changes flag
      setHasChanges(false);

      // Invalidate and refetch queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${slug}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });

      toast({
        title: "Success",
        description: "Module order updated successfully",
      });
    },
    onError: (error) => {
      console.error('Update module order error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update module order",
        variant: "destructive",
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => (item._id || `module-${items.indexOf(item)}`) === active.id);
        const newIndex = items.findIndex((item) => (item._id || `module-${items.indexOf(item)}`) === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  }

  const handleSaveOrder = () => {
    updateModuleOrderMutation.mutate(modules);
  };

  const moveModuleUp = (index: number) => {
    if (index > 0) {
      const newModules = [...modules];
      [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];
      setModules(newModules);
      setHasChanges(true);
    }
  };

  const moveModuleDown = (index: number) => {
    if (index < modules.length - 1) {
      const newModules = [...modules];
      [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];
      setModules(newModules);
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Skeleton className="h-6 w-6 mr-3" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !courseData) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-500">Error loading course data. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Edit Course: {courseData.title} | AGI.online</title>
        <meta name="description" content={`Edit course modules and content for ${courseData.title}`} />
      </Helmet>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/admin/courses')}
              className="mr-3"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Courses
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">
              Edit Course: {courseData.title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {updateModuleOrderMutation.isPending ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                Saving Changes...
              </Badge>
            ) : hasChanges ? (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                Unsaved Changes
              </Badge>
            ) : null}
            <Button
              onClick={handleSaveOrder}
              disabled={!hasChanges || updateModuleOrderMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {updateModuleOrderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Course Title</label>
                  <Input value={courseData.title} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Course Slug</label>
                  <Input value={courseData.slug} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Badge variant="outline">
                    {courseData.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea value={courseData.description} readOnly rows={4} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Total Modules</label>
                  <div className="text-2xl font-bold text-blue-600">{modules.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Reordering */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Course Modules</span>
                  <div className="text-sm text-gray-500">
                    Drag modules to reorder them
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {updateModuleOrderMutation.isPending && (
                  <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center rounded-lg">
                    <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-lg">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700">Saving module order...</span>
                    </div>
                  </div>
                )}
                {modules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No modules found for this course.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={modules.map((module, index) => module._id || `module-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {modules.map((module, index) => (
                        <div key={module._id || `module-${index}`} className="relative">
                          <SortableModuleItem
                            module={module}
                            index={index}
                            isDisabled={updateModuleOrderMutation.isPending}
                          />

                          {/* Alternative Up/Down buttons */}
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveModuleUp(index)}
                              disabled={index === 0 || updateModuleOrderMutation.isPending}
                              className="h-6 w-6 p-0"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveModuleDown(index)}
                              disabled={index === modules.length - 1 || updateModuleOrderMutation.isPending}
                              className="h-6 w-6 p-0"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 