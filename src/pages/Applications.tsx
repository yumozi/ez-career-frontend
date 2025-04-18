import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function Applications() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
                <p className="text-muted-foreground mt-1">Track and manage your job applications</p>
              </div>
              
              <div className="flex items-center justify-center h-[50vh]">
                <p className="text-muted-foreground">No applications found.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
} 