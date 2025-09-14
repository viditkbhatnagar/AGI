import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, ExternalLink, Users } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

export default function TeacherLiveClasses() {
  const { data: liveClasses = [], isLoading } = useQuery({
    queryKey: ['/api/teacher/live-classes'],
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

  const now = Date.now();
  const upcomingClasses = liveClasses.filter(lc => new Date(lc.startTime).getTime() > now);
  const completedClasses = liveClasses.filter(lc => new Date(lc.endTime).getTime() < now);
  const inProgressClasses = liveClasses.filter(lc => {
    const start = new Date(lc.startTime).getTime();
    const end = new Date(lc.endTime).getTime();
    return now >= start && now <= end;
  });

  const getStatusBadge = (liveClass) => {
    const start = new Date(liveClass.startTime).getTime();
    const end = new Date(liveClass.endTime).getTime();
    
    if (now < start) {
      return <Badge variant="outline" className="text-blue-600 bg-blue-50">Upcoming</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge variant="outline" className="text-yellow-600 bg-yellow-50">In Progress</Badge>;
    } else {
      return <Badge variant="outline" className="text-green-600 bg-green-50">Completed</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Live Classes | Teacher Portal</title>
        <meta name="description" content="Manage your live classes and join scheduled sessions." />
      </Helmet>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Live Classes</h1>
            <p className="text-gray-600 mt-1">Your scheduled live teaching sessions</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{upcomingClasses.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">{inProgressClasses.length}</p>
                </div>
                <Video className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedClasses.length}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {liveClasses.length > 0 ? (
          <div className="space-y-4">
            {liveClasses
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .map((liveClass, index) => (
                <Card key={liveClass._id || index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{liveClass.title}</h3>
                          {getStatusBadge(liveClass)}
                        </div>
                        
                        <p className="text-gray-600 mb-3">{liveClass.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Date:</span>
                              <span>{formatDate(liveClass.startTime)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Time:</span>
                              <span>{formatTime(liveClass.startTime)} - {formatTime(liveClass.endTime)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Video className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Course:</span>
                              <Badge variant="outline">{liveClass.courseSlug}</Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">Students:</span>
                              <span>{liveClass.studentIds?.length || 0} enrolled</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        {liveClass.meetLink && (
                          <Button size="sm" asChild>
                            <a href={liveClass.meetLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Join Meeting
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
              <Video className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Live Classes Scheduled</h3>
              <p className="text-gray-600">You don't have any live classes scheduled yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}