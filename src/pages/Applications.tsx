import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { FaPlus, FaEdit, FaExternalLinkAlt } from "react-icons/fa";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

// Define application status options
const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted', label: 'Accepted' }
];

// Define status badge styles
const STATUS_STYLES = {
  applied: "bg-blue-100 text-blue-800",
  assessment: "bg-purple-100 text-purple-800",
  interview: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  accepted: "bg-green-100 text-green-800",
};

interface Application {
  id: string;
  user_id: string;
  position_title: string;
  company_name: string;
  applied_at: string;
  status: 'applied' | 'assessment' | 'interview' | 'rejected' | 'accepted';
  link?: string;
  notes?: string;
}

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<Partial<Application>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Function to fetch applications from Supabase
  const fetchApplications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching applications:', error);
        toast({
          title: "Error",
          description: "Failed to load applications",
          variant: "destructive",
        });
        return;
      }
      
      setApplications(data || []);
    } catch (error) {
      console.error('Error in fetchApplications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch applications on component mount
  useEffect(() => {
    fetchApplications();
  }, [user]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time with precision to minutes
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle opening the dialog for a new application
  const handleNewApplication = () => {
    setCurrentApplication({
      position_title: '',
      company_name: '',
      status: 'applied',
      link: '',
      notes: '',
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  // Handle viewing application details
  const handleViewApplication = (app: Application) => {
    setCurrentApplication(app);
    setIsDetailsDialogOpen(true);
  };

  // Handle editing an existing application
  const handleEditApplication = () => {
    setIsDetailsDialogOpen(false);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setCurrentApplication(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle drag start event
  const handleDragStart = (e: React.DragEvent, app: Application) => {
    e.dataTransfer.setData('application_id', app.id);
  };

  // Handle drop event
  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const applicationId = e.dataTransfer.getData('application_id');
    
    // Find the application by id
    const app = applications.find(app => app.id === applicationId);
    if (!app || app.status === status) return;
    
    try {
      // Update the application status in the database
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);
        
      if (error) {
        console.error('Error updating application status:', error);
        toast({
          title: "Error",
          description: "Failed to update application status",
          variant: "destructive",
        });
        return;
      }
      
      // Update the local state
      setApplications(prevApps => 
        prevApps.map(app => 
          app.id === applicationId 
            ? { ...app, status: status as any } 
            : app
        )
      );
      
      toast({
        title: "Status Updated",
        description: "Application status updated successfully",
      });
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  // Handle drag over event
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle saving application (create or update)
  const handleSaveApplication = async () => {
    if (!user || !currentApplication.position_title || !currentApplication.company_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const applicationData = {
        user_id: user.id,
        position_title: currentApplication.position_title,
        company_name: currentApplication.company_name,
        status: currentApplication.status || 'applied',
        link: currentApplication.link || null,
        notes: currentApplication.notes || null,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (isEditing && currentApplication.id) {
        // Update existing application
        result = await supabase
          .from('applications')
          .update(applicationData)
          .eq('id', currentApplication.id);
      } else {
        // Insert new application
        result = await supabase
          .from('applications')
          .insert({ ...applicationData, applied_at: new Date().toISOString() });
      }
      
      const { error } = result;
      
      if (error) {
        console.error('Error saving application:', error);
        toast({
          title: "Error",
          description: `Failed to ${isEditing ? 'update' : 'create'} application`,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: `Application ${isEditing ? 'updated' : 'created'} successfully`,
      });
      
      // Refresh the applications list
      fetchApplications();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving application:', error);
    }
  };
  
  // Group applications by status
  const applicationsByStatus = {
    applied: applications.filter(app => app.status === 'applied'),
    assessment: applications.filter(app => app.status === 'assessment'),
    interview: applications.filter(app => app.status === 'interview'),
    accepted: applications.filter(app => app.status === 'accepted'),
    rejected: applications.filter(app => app.status === 'rejected')
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
                  <p className="text-muted-foreground mt-1">Track and manage your job applications</p>
                </div>
                <Button onClick={handleNewApplication} className="flex items-center gap-2">
                  <FaPlus size={14} />
                  <span>Add Application</span>
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-[50vh]">
                  <p className="text-muted-foreground">Loading applications...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] border rounded-lg p-8">
                  <p className="text-muted-foreground mb-4">No applications found.</p>
                  <Button onClick={handleNewApplication} variant="outline">
                    Add Your First Application
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Applied Column */}
                  <div 
                    className="border rounded-md bg-background shadow-sm"
                    onDrop={(e) => handleDrop(e, 'applied')}
                    onDragOver={handleDragOver}
                  >
                    <div className="p-4 border-b">
                      <h3 className="font-medium flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        Applied
                        <Badge variant="outline" className="ml-auto">
                          {applicationsByStatus.applied.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="p-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-250px)]">
                      {applicationsByStatus.applied.map(app => (
                        <Card
                          key={app.id}
                          className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onClick={() => handleViewApplication(app)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium truncate">{app.position_title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{app.company_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Assessment Column */}
                  <div 
                    className="border rounded-md bg-background shadow-sm"
                    onDrop={(e) => handleDrop(e, 'assessment')}
                    onDragOver={handleDragOver}
                  >
                    <div className="p-4 border-b">
                      <h3 className="font-medium flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-purple-500" />
                        Assessment
                        <Badge variant="outline" className="ml-auto">
                          {applicationsByStatus.assessment.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="p-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-250px)]">
                      {applicationsByStatus.assessment.map(app => (
                        <Card
                          key={app.id}
                          className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onClick={() => handleViewApplication(app)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium truncate">{app.position_title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{app.company_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Interview Column */}
                  <div 
                    className="border rounded-md bg-background shadow-sm"
                    onDrop={(e) => handleDrop(e, 'interview')}
                    onDragOver={handleDragOver}
                  >
                    <div className="p-4 border-b">
                      <h3 className="font-medium flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        Interview
                        <Badge variant="outline" className="ml-auto">
                          {applicationsByStatus.interview.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="p-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-250px)]">
                      {applicationsByStatus.interview.map(app => (
                        <Card
                          key={app.id}
                          className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onClick={() => handleViewApplication(app)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium truncate">{app.position_title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{app.company_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Accepted Column */}
                  <div 
                    className="border rounded-md bg-background shadow-sm"
                    onDrop={(e) => handleDrop(e, 'accepted')}
                    onDragOver={handleDragOver}
                  >
                    <div className="p-4 border-b">
                      <h3 className="font-medium flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        Accepted
                        <Badge variant="outline" className="ml-auto">
                          {applicationsByStatus.accepted.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="p-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-250px)]">
                      {applicationsByStatus.accepted.map(app => (
                        <Card
                          key={app.id}
                          className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onClick={() => handleViewApplication(app)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium truncate">{app.position_title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{app.company_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Rejected Column */}
                  <div 
                    className="border rounded-md bg-background shadow-sm"
                    onDrop={(e) => handleDrop(e, 'rejected')}
                    onDragOver={handleDragOver}
                  >
                    <div className="p-4 border-b">
                      <h3 className="font-medium flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        Rejected
                        <Badge variant="outline" className="ml-auto">
                          {applicationsByStatus.rejected.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="p-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-250px)]">
                      {applicationsByStatus.rejected.map(app => (
                        <Card
                          key={app.id}
                          className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onClick={() => handleViewApplication(app)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium truncate">{app.position_title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{app.company_name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      {/* Create/Edit Application Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Application' : 'Add New Application'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the details of your job application' 
                : 'Enter the details of your job application'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                Company*
              </Label>
              <Input
                id="company"
                value={currentApplication.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Position*
              </Label>
              <Input
                id="position"
                value={currentApplication.position_title || ''}
                onChange={(e) => handleInputChange('position_title', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={currentApplication.status || 'applied'} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Link
              </Label>
              <Input
                id="link"
                type="url"
                placeholder="https://..."
                value={currentApplication.link || ''}
                onChange={(e) => handleInputChange('link', e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right align-top pt-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this application..."
                value={currentApplication.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApplication}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Application Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h3 className="text-xl font-semibold">{currentApplication.position_title}</h3>
              <p className="text-muted-foreground">{currentApplication.company_name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className={currentApplication.status ? STATUS_STYLES[currentApplication.status as keyof typeof STATUS_STYLES] : ''}>
                  {currentApplication.status && currentApplication.status.charAt(0).toUpperCase() + currentApplication.status.slice(1)}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Applied At</p>
                <p>{currentApplication.applied_at && formatDateTime(currentApplication.applied_at)}</p>
              </div>
            </div>
            
            {currentApplication.link && (
              <div>
                <p className="text-sm font-medium text-gray-500">Link</p>
                <div className="flex items-center gap-2">
                  <a 
                    href={currentApplication.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {currentApplication.link}
                    <FaExternalLinkAlt size={12} />
                  </a>
                </div>
              </div>
            )}
            
            {currentApplication.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <p className="whitespace-pre-line">{currentApplication.notes}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleEditApplication}>
              <FaEdit className="mr-2" size={14} /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
} 