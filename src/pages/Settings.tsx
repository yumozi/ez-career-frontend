import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaBell, FaKey, FaShieldAlt } from "react-icons/fa";

const Settings = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">Customize your application preferences and notifications</p>
              </div>
              
              <Tabs defaultValue="preferences" className="w-full max-w-3xl mx-auto">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preferences" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Application Preferences</CardTitle>
                      <CardDescription>Customize your job application experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="autoApply" className="text-base">Automated Applications</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically apply to jobs that match your preferences
                            </p>
                          </div>
                          <Switch id="autoApply" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="aiSuggestions" className="text-base">AI Suggestions</Label>
                            <p className="text-sm text-muted-foreground">
                              Get AI-powered suggestions to improve your applications
                            </p>
                          </div>
                          <Switch id="aiSuggestions" defaultChecked />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="jobAlerts" className="text-base">Job Alerts</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive alerts for new jobs that match your profile
                            </p>
                          </div>
                          <Switch id="jobAlerts" defaultChecked />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="darkMode" className="text-base">Dark Mode</Label>
                            <p className="text-sm text-muted-foreground">
                              Toggle between light and dark theme
                            </p>
                          </div>
                          <Switch id="darkMode" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="defaultResume" className="text-base">Default Resume</Label>
                        <Select defaultValue="resume1">
                          <SelectTrigger id="defaultResume">
                            <SelectValue placeholder="Select default resume" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="resume1">John-Person-Resume.pdf</SelectItem>
                            <SelectItem value="resume2">John-Person-Technical-Resume.pdf</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="defaultCover" className="text-base">Default Cover Letter</Label>
                        <Select defaultValue="cover1">
                          <SelectTrigger id="defaultCover">
                            <SelectValue placeholder="Select default cover letter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover1">John-Person-Cover-Letter.pdf</SelectItem>
                            <SelectItem value="cover2">John-Person-Technical-Cover-Letter.pdf</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button>Save Preferences</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="notifications" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>Manage when and how you get notified</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                          <FaBell className="h-4 w-4" />
                          <span>Email Notifications</span>
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="emailNewJobs" className="cursor-pointer">New matching jobs</Label>
                            <Switch id="emailNewJobs" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="emailApplicationStatus" className="cursor-pointer">Application status updates</Label>
                            <Switch id="emailApplicationStatus" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="emailInterviews" className="cursor-pointer">Interview invitations</Label>
                            <Switch id="emailInterviews" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="emailPromotions" className="cursor-pointer">Promotions and tips</Label>
                            <Switch id="emailPromotions" />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                          <FaBell className="h-4 w-4" />
                          <span>In-App Notifications</span>
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pushNewJobs" className="cursor-pointer">New matching jobs</Label>
                            <Switch id="pushNewJobs" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pushApplicationStatus" className="cursor-pointer">Application status updates</Label>
                            <Switch id="pushApplicationStatus" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pushInterviews" className="cursor-pointer">Interview invitations</Label>
                            <Switch id="pushInterviews" defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pushPromotions" className="cursor-pointer">Promotions and tips</Label>
                            <Switch id="pushPromotions" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button>Save Notification Settings</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="account" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                      <CardDescription>Manage your account details and security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                          <FaKey className="h-4 w-4" />
                          <span>Password</span>
                        </h3>
                        <Button variant="outline">Change Password</Button>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium flex items-center gap-2 mb-3">
                          <FaShieldAlt className="h-4 w-4" />
                          <span>Account Security</span>
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="2fa" className="cursor-pointer">Two-factor authentication</Label>
                              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                            </div>
                            <Switch id="2fa" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="sessionTimeout" className="cursor-pointer">Session timeout</Label>
                              <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
                            </div>
                            <Switch id="sessionTimeout" defaultChecked />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium text-destructive mb-3">Danger Zone</h3>
                        <div className="border border-destructive/30 rounded-md p-4">
                          <h4 className="font-medium">Delete Account</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Permanently delete your account and all associated data
                          </p>
                          <Button variant="destructive" size="sm">Delete Account</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings; 