import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CourseSelectionDialog } from "./CourseSelectionDialog";
import { Copy } from "lucide-react";

// Example of how to integrate the CourseSelectionDialog into the sandbox courses page
export function CourseSelectionDialogExample() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // This would come from your existing query in the sandbox courses page
  const sandboxCourses = []; // Replace with actual data from useQuery
  
  const handleCopyConfirm = (selectedCourses: string[]) => {
    console.log('Copying courses:', selectedCourses);
    // Here you would call your copy API endpoint
    // Example:
    // copyMutation.mutate({ sandboxCourseSlugs: selectedCourses });
  };

  return (
    <>
      {/* This button would be added to the sandbox courses page header */}
      <Button onClick={() => setIsDialogOpen(true)}>
        <Copy className="mr-2 h-4 w-4" />
        Copy to Courses
      </Button>

      {/* The dialog component */}
      <CourseSelectionDialog
        sandboxCourses={sandboxCourses}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleCopyConfirm}
      />
    </>
  );
}

// Integration instructions:
// 1. Add the "Copy to Courses" button to the sandbox courses page header
// 2. Import and use the CourseSelectionDialog component
// 3. Pass the sandbox courses data from your existing useQuery
// 4. Handle the onConfirm callback to call your copy API endpoint
// 5. Manage the dialog open/close state