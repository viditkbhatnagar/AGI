import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyProgressDialog } from "./CopyProgressDialog";
import { Copy } from "lucide-react";

// Example of how to integrate the CopyProgressDialog into the copy workflow
export function CopyProgressDialogExample() {
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    current: undefined,
    results: []
  });

  // Simulate copy operation for demonstration
  const simulateCopyOperation = () => {
    const mockCourses = [
      "financial-services-overview",
      "supply-chain-management", 
      "digital-marketing-fundamentals"
    ];

    setProgress({
      total: mockCourses.length,
      completed: 0,
      current: undefined,
      results: []
    });
    setIsProgressOpen(true);

    // Simulate progressive updates
    let completed = 0;
    const interval = setInterval(() => {
      completed++;
      const currentCourse = mockCourses[completed - 1];
      
      // Simulate some failures for demonstration
      const success = Math.random() > 0.3; // 70% success rate
      
      setProgress(prev => ({
        ...prev,
        completed,
        current: completed < mockCourses.length ? mockCourses[completed] : undefined,
        results: [
          ...prev.results,
          {
            sandboxSlug: currentCourse,
            success,
            newCourseSlug: success ? `${currentCourse}-copy` : undefined,
            error: success ? undefined : "Failed to transform document structure",
            duplicateHandled: success && Math.random() > 0.7 // 30% chance of duplicate handling
          }
        ]
      }));

      if (completed >= mockCourses.length) {
        clearInterval(interval);
      }
    }, 2000); // 2 second delay between each course
  };

  return (
    <div className="p-4">
      <Button onClick={simulateCopyOperation} className="flex items-center gap-2">
        <Copy className="h-4 w-4" />
        Simulate Copy Operation
      </Button>

      <CopyProgressDialog
        isOpen={isProgressOpen}
        progress={progress}
        onClose={() => setIsProgressOpen(false)}
      />
    </div>
  );
}