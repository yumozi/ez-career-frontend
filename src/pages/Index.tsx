import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ApplicationStatus } from "@/components/dashboard/ApplicationStatus";
import { RecentApplications } from "@/components/dashboard/RecentApplications";
import { FaBriefcase, FaCheckCircle, FaChartLine } from "react-icons/fa";

const applicationStages = [
  { id: '1', name: 'Applied', count: 12, color: '#3B82F6' },
  { id: '2', name: 'Interview', count: 5, color: '#F59E0B' },
  { id: '3', name: 'Assessment', count: 3, color: '#8B5CF6' },
  { id: '4', name: 'Offer', count: 2, color: '#10B981' },
  { id: '5', name: 'Rejected', count: 8, color: '#EF4444' },
];

const totalApplications = applicationStages.reduce((acc, stage) => acc + stage.count, 0);

const recentApplications = [
  {
    id: '1',
    companyName: 'Acme Inc.',
    position: 'Senior Frontend Developer',
    date: '2 days ago',
    status: 'interview' as const,
  },
  {
    id: '2',
    companyName: 'Tech Innovators',
    position: 'Full Stack Engineer',
    date: '3 days ago',
    status: 'applied' as const,
  },
  {
    id: '3',
    companyName: 'Global Systems',
    position: 'React Developer',
    date: '1 week ago',
    status: 'offer' as const,
  },
  {
    id: '4',
    companyName: 'Digital Solutions',
    position: 'UI/UX Developer',
    date: '2 weeks ago',
    status: 'rejected' as const,
  },
];

const Index = () => {
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
                    value="22%"
                    icon={<FaCheckCircle />}
                    trend="up"
                    trendValue="5% from last month"
                  />
                  
                  <StatsCard
                    title="Response Rate"
                    value="48%"
                    icon={<FaChartLine />}
                    trend="up"
                    trendValue="12% from last month"
                  />
                </div>
                
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <RecentApplications applications={recentApplications} />
                  </div>
                  
                  <div>
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
