import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ApplicationStatus } from "@/components/dashboard/ApplicationStatus";
import { RecentApplications } from "@/components/dashboard/RecentApplications";
import { FaBriefcase, FaCheckCircle, FaChartLine } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// Define types for your application data
interface Application {
  id: string;
  position_title: string;
  company_name: string;
  applied_at: string;
  status: 'applied' | 'assessment' | 'interview' | 'rejected' | 'accepted';
}

// Define types for UI display that match RecentApplications requirements
interface UIApplication {
  id: string;
  companyName: string;
  position: string;
  date: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  logo?: string;
}

interface ApplicationStage {
  id: string;
  name: string;
  count: number;
  color: string;
}

const Index = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applicationStages, setApplicationStages] = useState<ApplicationStage[]>([
    { id: '1', name: 'Applied', count: 0, color: '#3B82F6' },
    { id: '2', name: 'Assessment', count: 0, color: '#8B5CF6' },
    { id: '3', name: 'Interview', count: 0, color: '#F59E0B' },
    { id: '4', name: 'Accepted', count: 0, color: '#10B981' },
    { id: '5', name: 'Rejected', count: 0, color: '#EF4444' },
  ]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [responseRate, setResponseRate] = useState(0);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Fetch all applications for the current user
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('applied_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching applications:', error);
          return;
        }
        
        // Process the application data
        if (data) {
          setApplications(data);
          
          // Calculate counts for each status
          const counts = {
            applied: 0,
            assessment: 0,
            interview: 0,
            rejected: 0,
            accepted: 0
          };
          
          data.forEach(app => {
            counts[app.status as keyof typeof counts]++;
          });
          
          // Update application stages with counts
          setApplicationStages(prev => prev.map(stage => {
            if (stage.name === 'Applied') return { ...stage, count: counts.applied };
            if (stage.name === 'Assessment') return { ...stage, count: counts.assessment };
            if (stage.name === 'Interview') return { ...stage, count: counts.interview };
            if (stage.name === 'Accepted') return { ...stage, count: counts.accepted };
            if (stage.name === 'Rejected') return { ...stage, count: counts.rejected };
            return stage;
          }));
          
          const total = data.length;
          setTotalApplications(total);
          
          // Calculate success rate: (accepted / all applications) * 100
          const successRate = total > 0 ? Math.round((counts.accepted / total) * 100) : 0;
          setSuccessRate(successRate);
          
          // Calculate response rate: (accepted + rejected + interview + assessment) / all applications * 100
          const responsesCount = counts.accepted + counts.rejected + counts.interview + counts.assessment;
          const responseRate = total > 0 ? Math.round((responsesCount / total) * 100) : 0;
          setResponseRate(responseRate);
        }
      } catch (error) {
        console.error('Error in fetchApplications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchApplications();
  }, [user]);

  // Format applications for the RecentApplications component
  const recentApplications: UIApplication[] = applications.slice(0, 10).map(app => {
    // Map the database status to the UI status
    let uiStatus: 'applied' | 'interview' | 'offer' | 'rejected';
    
    if (app.status === 'accepted') {
      uiStatus = 'offer';
    } else if (app.status === 'assessment') {
      uiStatus = 'applied'; // Simplify assessment to applied for the UI
    } else {
      uiStatus = app.status as 'applied' | 'interview' | 'rejected';
    }
    
    return {
      id: app.id,
      companyName: app.company_name,
      position: app.position_title,
      date: formatRelativeTime(new Date(app.applied_at)),
      status: uiStatus
    };
  });

  // Helper function to format dates as relative time (e.g., "2 days ago")
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">     
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Job Application Manager</h1>
                <p className="text-muted-foreground mt-1">Streamline your job search process and track applications</p>
              </div>
              
              <section className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatsCard
                    title="Total Applications"
                    value={totalApplications}
                    icon={<FaBriefcase />}
                    description="All applications in the system"
                  />
                  
                  <StatsCard
                    title="Success Rate"
                    value={`${successRate}%`}
                    icon={<FaCheckCircle />}
                    description="Offers received"
                  />
                  
                  <StatsCard
                    title="Response Rate"
                    value={`${responseRate}%`}
                    icon={<FaChartLine />}
                    description="Applications with responses"
                  />
                </div>
                
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 h-[400px] flex flex-col">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Loading applications...</p>
                      </div>
                    ) : recentApplications.length > 0 ? (
                      <div className="flex flex-col h-full overflow-hidden">
                        <RecentApplications applications={recentApplications} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full border rounded-lg">
                        <p className="text-muted-foreground">No applications found. Start applying for jobs!</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-[400px] flex flex-col">
                    <ApplicationStatus stages={applicationStages} totalApplications={totalApplications} />
                  </div>
                </section>
              </section>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
