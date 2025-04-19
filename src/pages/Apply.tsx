import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Job suggestions for quick selection
const jobSuggestions = [
  "Software Engineer",
  "Product Manager",
  "Data Scientist",
  "UX Designer",
  "Frontend Developer"
];

export default function Apply() {
  const [jobTitle, setJobTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const { toast } = useToast();

  // Poll for active tasks when there's an active trace ID or a cancel is requested
  useEffect(() => {
    if (!activeTraceId && !cancelRequested) return;

    const checkTaskStatus = async () => {
      try {
        const response = await fetch("http://localhost:8000/tasks/status");
        if (response.ok) {
          const data = await response.json();
          setActiveTasks(data.active_tasks);

          // Check if our task is still active
          if (activeTraceId && !data.active_tasks.includes(activeTraceId)) {
            if (cancelRequested) {
              console.log("Task has been successfully cancelled");
              setStatusMessage("Task has been successfully cancelled");
              setCancelRequested(false);
              setTimeout(() => {
                setIsLoading(false);
                setStatusMessage(null);
                setActiveTraceId(null);
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error("Error checking task status:", error);
      }
    };

    // Run immediately
    checkTaskStatus();

    // Then set up polling
    const intervalId = setInterval(checkTaskStatus, 2000);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [activeTraceId, cancelRequested]);

  const handleSuggestionClick = (suggestion: string) => {
    setJobTitle(suggestion);
  };

  const handleApply = async () => {
    if (!jobTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a job title before applying.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage("Starting application process...");
    setCancelRequested(false);

    try {
      // Replace [user-filled] with the actual job title
      const taskString = `Search up ${jobTitle} jobs and apply to any one. Do not pick around. Just apply to one as fast as possible. Don't use autofill or LinkedIn, instead enter information manually.`;

      const response = await fetch("http://localhost:8000/orchestrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          task: taskString
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Application submitted:", data);

      // Store the trace ID for potential cancellation
      setActiveTraceId(data.trace_id);

      // Check if the application was cancelled
      if (data.result === "Task was cancelled") {
        setStatusMessage(null);
        toast({
          title: "Application Cancelled",
          description: "The application process was cancelled.",
        });
        setIsLoading(false);
        setActiveTraceId(null);
      } else {
        setStatusMessage(null);
        toast({
          title: "Application Submitted",
          description: `Your application for ${jobTitle} jobs has been submitted successfully.`,
        });
        setIsLoading(false);
        setActiveTraceId(null);
      }
    } catch (error) {
      console.error("Application error:", error);
      setStatusMessage(null);
      toast({
        title: "Application Failed",
        description: `Failed to submit application: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      setIsLoading(false);
      setActiveTraceId(null);
    }
  };

  const cancelApplication = async () => {
    if (!activeTraceId) {
      console.error("No active trace ID to cancel");
      return;
    }

    try {
      setStatusMessage("Cancelling application process...");
      console.log("Sending cancellation request for trace_id:", activeTraceId);
      setCancelRequested(true);

      // Log the request details for debugging
      const requestData = {
        trace_id: activeTraceId
      };
      console.log("Cancel request payload:", JSON.stringify(requestData));

      // Directly call fetch with full error logging
      try {
        const response = await fetch("http://localhost:8000/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(requestData)
        });

        // Log response status
        console.log(`Cancel response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server error: ${response.status}`, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Cancel response data:", data);

        if (data.success) {
          setStatusMessage("Cancellation request sent successfully. Waiting for confirmation...");
          // Force check status immediately
          checkTaskStatus(false); // Don't show toast
        } else {
          console.error("Cancellation failed on server:", data.message);
          toast({
            title: "Cancellation Error",
            description: data.message || "Failed to cancel the application on the server.",
            variant: "destructive",
          });

          // If server says no active task, force reset UI anyway
          if (data.message.includes("No active task found")) {
            forceResetApplicationState();
          } else {
            setCancelRequested(false);
          }
        }
      } catch (fetchError) {
        console.error("Fetch error during cancel:", fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      setCancelRequested(false);
      toast({
        title: "Cancellation Failed",
        description: `Failed to cancel application: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });

      // If all else fails, offer to force reset
      toast({
        title: "Reset Application",
        description: "Would you like to force reset the application state?",
        action: (
          <Button onClick={forceResetApplicationState} variant="destructive" size="sm">
            Reset
          </Button>
        ),
      });
    }
  };

  // Force reset the application state regardless of backend
  const forceResetApplicationState = () => {
    console.log("Forcing application state reset");
    setIsLoading(false);
    setActiveTraceId(null);
    setStatusMessage(null);
    setCancelRequested(false);
    toast({
      title: "Application Reset",
      description: "The application state has been reset.",
    });
  };

  // Modified to accept a parameter to control toast
  const checkTaskStatus = async (showToast = true) => {
    try {
      const response = await fetch("http://localhost:8000/tasks/status");
      if (response.ok) {
        const data = await response.json();
        console.log("Active tasks:", data.active_tasks);
        setActiveTasks(data.active_tasks);

        if (showToast) {
          toast({
            title: "Active Tasks",
            description: `There are ${data.count} active tasks.`,
          });
        }

        // If our task is not among active tasks, reset state
        if (activeTraceId && !data.active_tasks.includes(activeTraceId)) {
          console.log("Our task is no longer active, resetting state");
          setTimeout(() => forceResetApplicationState(), 2000);
        }
      }
    } catch (error) {
      console.error("Error checking task status:", error);
      if (showToast) {
        toast({
          title: "Status Check Failed",
          description: "Failed to check task status.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Apply</h1>
                <p className="text-muted-foreground mt-1">Search and apply for jobs</p>
              </div>

              <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {isLoading && statusMessage && (
                        <Alert className="bg-blue-50 border-blue-200">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              <AlertTitle>Processing</AlertTitle>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => checkTaskStatus(true)}
                                className="h-8 px-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Check Status
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelApplication}
                                disabled={cancelRequested}
                                className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                {cancelRequested ? "Cancelling..." : "Cancel"}
                              </Button>
                            </div>
                          </div>
                          <AlertDescription>{statusMessage}</AlertDescription>
                          {activeTraceId && (
                            <div className="mt-2 text-xs text-gray-500">
                              Task ID: {activeTraceId}
                            </div>
                          )}
                        </Alert>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-lg">
                        <span>I want to apply to</span>
                        <Input
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="w-64 inline-flex"
                          placeholder="Enter job title"
                          disabled={isLoading}
                        />
                        <span>jobs.</span>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                          {jobSuggestions.map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="hover:bg-primary hover:text-white transition-colors"
                              disabled={isLoading}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleApply}
                        size="lg"
                        className="w-full font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Submitting..." : "Apply Now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
} 