import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, ExternalLink, Video } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const canJoinClass = (lc: {
  status: string;
  startTime: string | Date;
  endTime: string | Date;
}) => {
  const now   = new Date();
  const start = new Date(lc.startTime);
  const end   = new Date(lc.endTime);

  return (
    lc.status === 'live' ||
    (lc.status === 'scheduled' && start <= now && now <= end)
  );
};

export function LiveClasses() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/student/live-classes']
  });
  
  if (isLoading) {
    return <LiveClassesSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Live Classes</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading live classes. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Live Classes</h1>
        <p className="text-gray-500 mt-1">Join interactive live sessions with instructors</p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          {data?.length > 0 ? (
            <div className="space-y-4">
              {(data as any[]).map((liveClass: any) => (
                <div key={liveClass._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center">
                        <Video className="text-primary mr-2 h-5 w-5" />
                        <h3 className="font-medium text-gray-800">{liveClass.title}</h3>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">{liveClass.course?.title}</p>
                      <div className="flex flex-wrap items-center mt-2 text-sm text-gray-600 gap-2">
                        <div className="flex items-center">
                          <CalendarClock className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{formatDateTime(liveClass.startTime)}</span>
                        </div>
                        <Badge variant="outline">
                          {Math.round((new Date(liveClass.endTime).getTime() - new Date(liveClass.startTime).getTime()) / (1000 * 60))} minutes
                        </Badge>
                        
                        {new Date(liveClass.startTime).getTime() - new Date().getTime() < 1000 * 60 * 15 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                            Starting soon
                          </Badge>
                        )}
                      </div>
                      
                      {liveClass.description && (
                        <p className="mt-2 text-sm text-gray-600">{liveClass.description}</p>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-0">
                      {canJoinClass(liveClass) ? (
                        <Button asChild className="w-full md:w-auto">
                          <a
                            href={liveClass.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Join&nbsp;Now
                          </a>
                        </Button>
                      ) : (
                        <Button className="w-full md:w-auto" disabled>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {new Date(liveClass.startTime) > new Date()
                            ? 'Join at Scheduled Time'
                            : 'Session Ended'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <CalendarClock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Upcoming Live Classes</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are no live classes scheduled for your enrolled courses at the moment. 
                Check back later for updates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LiveClassesSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      
      <Card>
        <CardContent className="p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="w-full sm:w-2/3">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-56 mb-3" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-10 w-32 mt-4 sm:mt-0" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default LiveClasses;
