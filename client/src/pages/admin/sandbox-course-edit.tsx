import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function SandboxCourseEditPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sandbox Course Module Reordering
            </CardTitle>
            <CardDescription>
              Module reordering functionality for sandbox courses - Coming Soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This feature will allow you to reorder modules in sandbox courses.
              For now, you can edit the course to modify the module order.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
