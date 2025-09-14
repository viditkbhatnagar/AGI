import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Download, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

export default function TeacherRecordings() {
  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['/api/teacher/recordings'],
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Recordings | Teacher Portal</title>
        <meta name="description" content="View course recordings for your assigned courses." />
      </Helmet>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Course Recordings</h1>
            <p className="text-gray-600 mt-1">Recordings for your assigned courses</p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {recordings.length} recordings
          </div>
        </div>

        {recordings.length > 0 ? (
          <div className="space-y-4">
            {recordings
              .sort((a, b) => new Date(b.classDate).getTime() - new Date(a.classDate).getTime())
              .map((recording, index) => (
                <Card key={recording._id || index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{recording.title}</h3>
                            <Badge variant="outline">{recording.courseSlug}</Badge>
                          </div>
                        </div>
                        
                        {recording.description && (
                          <p className="text-gray-600 mb-3">{recording.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Class Date: {formatDate(recording.classDate)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span>Uploaded: {formatDate(recording.uploadedAt)}</span>
                          </div>
                          <Badge variant={recording.isVisible ? 'default' : 'secondary'}>
                            {recording.isVisible ? 'Visible' : 'Hidden'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        {recording.fileUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={recording.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />
                              View Recording
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recordings Available</h3>
              <p className="text-gray-600">There are no recordings available for your courses yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}