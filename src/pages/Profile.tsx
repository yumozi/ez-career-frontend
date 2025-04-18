import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaPlus, FaTrash, FaGraduationCap, FaBriefcase, FaAward, FaUpload, FaFile, FaFilePdf } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  resume_url: string | null;
}

const Profile = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    resume_url: null
  });
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data when component mounts
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        console.log('Fetching profile data for user:', user.id);
        
        // Use a simpler query structure
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone, resume_url')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error fetching profile data:', error);
          toast({
            title: "Error Loading Profile",
            description: "There was a problem loading your profile information.",
            variant: "destructive"
          });
          return;
        }

        // Check if we got data back
        if (data && data.length > 0) {
          console.log('Profile data retrieved:', data[0]);
          // Log specifically the resume_url to troubleshoot
          console.log('Resume URL from database:', data[0].resume_url);
          
          setProfileData({
            first_name: data[0].first_name,
            last_name: data[0].last_name,
            email: data[0].email,
            phone: data[0].phone,
            resume_url: data[0].resume_url
          });
        } else {
          console.log('No profile found, will use empty values');
        }
      } catch (error) {
        console.error('Error in profile fetch:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Only update existing profile, never create a new one here
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          phone: profileData.phone,
          resume_url: profileData.resume_url,
          updated_at: new Date()
        })
        .eq('user_id', user.id);
          
      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Profile information updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value || null
    }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Resume must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingResume(true);
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;
      
      console.log('Uploading resume to path:', filePath);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      console.log('Resume URL generated:', urlData.publicUrl);

      // Update profile with resume URL
      setProfileData(prev => ({
        ...prev,
        resume_url: urlData.publicUrl
      }));

      // Explicitly save the profile data with the new URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          resume_url: urlData.publicUrl,
          updated_at: new Date()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating resume URL in profile:', updateError);
        throw updateError;
      }

      console.log('Resume URL saved to profile successfully');

      toast({
        title: "Resume Uploaded",
        description: "Your resume has been uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your resume",
        variant: "destructive"
      });
    } finally {
      setIsUploadingResume(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveResume = async () => {
    if (!user || !profileData.resume_url) return;

    try {
      // Extract file path from the URL
      const url = new URL(profileData.resume_url);
      const filePath = url.pathname.split('/').slice(-2).join('/');

      // Delete from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('user-uploads')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting resume from storage:', deleteError);
      }

      // Update profile to remove resume URL
      setProfileData(prev => ({
        ...prev,
        resume_url: null
      }));

      // Update the profile directly
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          resume_url: null,
          updated_at: new Date()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile to remove resume URL:', updateError);
        throw updateError;
      }

      toast({
        title: "Resume Removed",
        description: "Your resume has been removed",
      });
    } catch (error) {
      console.error('Error removing resume:', error);
      toast({
        title: "Error",
        description: "There was a problem removing your resume",
        variant: "destructive"
      });
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!user) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-background flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 pb-10">
              <div className="container mt-8 px-4 sm:px-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                  <p className="text-muted-foreground mt-1">Please sign in to manage your profile</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your personal information</p>
              </div>
              
              <div className="w-full max-w-3xl mx-auto space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isLoadingProfile ? (
                      <div className="text-center py-4">Loading profile information...</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input 
                            id="firstName" 
                            value={profileData.first_name || ""} 
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input 
                            id="lastName" 
                            value={profileData.last_name || ""} 
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            value={profileData.email || ""} 
                            onChange={(e) => handleInputChange('email', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input 
                            id="phone" 
                            value={profileData.phone || ""} 
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Button 
                      onClick={handleProfileUpdate} 
                      disabled={isLoading || isLoadingProfile}
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resume</CardTitle>
                    <CardDescription>
                      Upload your resume as a PDF file (max 5MB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                    
                    {profileData.resume_url ? (
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FaFilePdf className="h-6 w-6 text-primary" />
                            <div>
                              <p className="font-medium">Resume</p>
                              <p className="text-xs text-muted-foreground">Click to preview</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPdfPreviewOpen(true)}
                            >
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveResume}
                            >
                              <FaTrash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-8">
                        <div className="text-center">
                          <FaFile className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Drag and drop your resume PDF here, or click to browse
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={triggerFileInput}
                            disabled={isUploadingResume}
                          >
                            {isUploadingResume ? (
                              "Uploading..."
                            ) : (
                              <>
                                <FaUpload className="h-3 w-3 mr-2" />
                                Upload Resume
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* PDF Preview Dialog */}
              <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
                <DialogContent className="max-w-4xl h-[80vh] p-0 pt-10 overflow-hidden">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Resume Preview</DialogTitle>
                    <DialogDescription>
                      Your uploaded resume document
                    </DialogDescription>
                  </DialogHeader>
                  {profileData.resume_url ? (
                    <div className="flex-1 h-full overflow-hidden pt-2">
                      <iframe
                        src={`${profileData.resume_url}#toolbar=0`}
                        className="w-full h-[calc(80vh-100px)]"
                        title="Resume PDF Preview"
                        onLoad={() => console.log('PDF iframe loaded successfully')}
                        onError={() => console.error('Failed to load PDF in iframe')}
                      />
                      <div className="p-4">
                        <p className="text-xs text-muted-foreground">
                          If the PDF doesn't load correctly, you can 
                          <a 
                            href={profileData.resume_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary ml-1 hover:underline"
                          >
                            open it directly
                          </a>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[calc(80vh-100px)]">
                      <p>No resume file available to preview</p>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* 
              // Original Tabs Component
              <Tabs defaultValue="personal" className="w-full max-w-3xl mx-auto">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your personal details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {isLoadingProfile ? (
                        <div className="text-center py-4">Loading profile information...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                              id="firstName" 
                              value={profileData.first_name || ""} 
                              onChange={(e) => handleInputChange('first_name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                              id="lastName" 
                              value={profileData.last_name || ""} 
                              onChange={(e) => handleInputChange('last_name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                              id="email" 
                              value={profileData.email || ""} 
                              onChange={(e) => handleInputChange('email', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input 
                              id="phone" 
                              value={profileData.phone || ""} 
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button 
                        onClick={handleProfileUpdate} 
                        disabled={isLoading || isLoadingProfile}
                      >
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="education" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Education</CardTitle>
                        <CardDescription>Add your educational background</CardDescription>
                      </div>
                      <Button size="sm" className="gap-1">
                        <FaPlus className="h-3 w-3" />
                        <span>Add Education</span>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FaGraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-medium">Computer Science, BSc</h4>
                                <p className="text-sm text-muted-foreground">University of Technology</p>
                                <p className="text-xs text-muted-foreground mt-1">2014 - 2018</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm mt-2">
                              Graduated with honors. Specialized in software engineering and data structures.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FaGraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-medium">Web Development Bootcamp</h4>
                                <p className="text-sm text-muted-foreground">CodeAcademy</p>
                                <p className="text-xs text-muted-foreground mt-1">2019</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm mt-2">
                              Intensive 12-week program focused on full-stack web development.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="experience" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Work Experience</CardTitle>
                        <CardDescription>Add your professional experience</CardDescription>
                      </div>
                      <Button size="sm" className="gap-1">
                        <FaPlus className="h-3 w-3" />
                        <span>Add Experience</span>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FaBriefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-medium">Senior Software Engineer</h4>
                                <p className="text-sm text-muted-foreground">Tech Innovations Inc.</p>
                                <p className="text-xs text-muted-foreground mt-1">Jan 2021 - Present</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm mt-2">
                              Leading development of the company's flagship SaaS product. Managing a team of 5 engineers and coordinating with product managers to deliver features on time.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FaBriefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-medium">Full Stack Developer</h4>
                                <p className="text-sm text-muted-foreground">Digital Solutions LLC</p>
                                <p className="text-xs text-muted-foreground mt-1">Mar 2018 - Dec 2020</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm mt-2">
                              Developed and maintained client websites and web applications. Worked with React, Node.js, and MongoDB to create scalable solutions.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="skills" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Skills & Certifications</CardTitle>
                        <CardDescription>Showcase your professional skills and certifications</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Label className="text-base">Technical Skills</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          <div className="flex items-center justify-between border rounded-md p-3">
                            <span className="text-sm">React</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div key={star} className={`w-2 h-2 rounded-full ${star <= 5 ? 'bg-primary' : 'bg-muted'}`} />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-3">
                            <span className="text-sm">TypeScript</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div key={star} className={`w-2 h-2 rounded-full ${star <= 5 ? 'bg-primary' : 'bg-muted'}`} />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between border rounded-md p-3">
                            <span className="text-sm">Node.js</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((star) => (
                                <div key={star} className={`w-2 h-2 rounded-full ${star <= 4 ? 'bg-primary' : 'bg-muted'}`} />
                              ))}
                              <div className="w-2 h-2 rounded-full bg-muted" />
                            </div>
                          </div>
                        </div>
                        <Button variant="link" className="p-0 h-auto mt-2">+ Add skill</Button>
                      </div>
                      
                      <div>
                        <Label className="text-base">Certifications</Label>
                        <div className="space-y-3 mt-2">
                          <div className="flex items-start gap-4 p-3 border rounded-md">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <FaAward className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-sm font-medium">AWS Certified Developer</h4>
                                  <p className="text-xs text-muted-foreground">Issued Dec 2022</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 p-3 border rounded-md">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <FaAward className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-sm font-medium">Google Professional Cloud Developer</h4>
                                  <p className="text-xs text-muted-foreground">Issued Aug 2023</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <FaTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="link" className="p-0 h-auto mt-2">+ Add certification</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              */}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Profile; 