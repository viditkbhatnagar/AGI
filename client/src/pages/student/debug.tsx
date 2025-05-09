import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-provider";

export default function DebugPage() {
  const { user, student } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [coursesData, setCoursesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData(endpoint: string) {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Data from ${endpoint}:`, data);
      
      if (endpoint === 'dashboard') {
        setDashboardData(data);
      } else if (endpoint === 'courses') {
        setCoursesData(data);
      }
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  // Automatically fetch data on first load
  useEffect(() => {
    fetchData('dashboard');
    fetchData('courses');
  }, []);

  return (
    <div className="p-6">
      <Helmet>
        <title>Debug Page | AGI.online</title>
      </Helmet>
      
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="flex gap-4 mb-4">
        <Button onClick={() => fetchData('dashboard')} variant="outline" disabled={isLoading}>
          Fetch Dashboard Data
        </Button>
        <Button onClick={() => fetchData('courses')} variant="outline" disabled={isLoading}>
          Fetch Courses Data
        </Button>
      </div>
      
      {error && (
        <Card className="mb-6 border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Auth Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="font-bold">User:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-bold">Student:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(student, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {dashboardData ? JSON.stringify(dashboardData, null, 2) : 'No data'}
            </pre>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Courses Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {coursesData ? JSON.stringify(coursesData, null, 2) : 'No data'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}