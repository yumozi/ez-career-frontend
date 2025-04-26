import { useState, useEffect, useRef } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

// localStorage key for storing active task information
const ACTIVE_TASK_KEY = "ez-frontend-active-task";

// Interface for the stored task data
interface StoredTaskData {
  traceId: string;
  jobTitle: string;
  timestamp: number;
  statusMessage: string | null;
  cancelRequested: boolean;
}

// Job suggestions for quick selection
const jobSuggestions = [
  // Position titles
  "Software Engineer",
  "Product Manager",
  "Data Scientist",
  "UX Designer",
  "Frontend Developer",
  "Full Stack Developer",
  // Company-specific
  "Jobs at Google",
  "Jobs at Microsoft",
  "Jobs at Amazon",
  // Qualification-based
  "Jobs that fit my profile",
  "Entry level positions",
  "Senior level positions",
  "Software engineering internships",
  // Location-based
  "Jobs in California",
  "Jobs in New York",
  // Filters
  "Remote jobs only",
  "Hybrid work opportunities",
  "Part-time positions"
];

export default function Apply() {
  const [jobTitle, setJobTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const pollingRef = useRef(false);

  // Check for active tasks on component mount
  useEffect(() => {
    const storedTaskData = localStorage.getItem(ACTIVE_TASK_KEY);

    if (storedTaskData) {
      try {
        const taskData: StoredTaskData = JSON.parse(storedTaskData);

        // Check if the stored task is recent (within last 24 hours)
        const isRecent = Date.now() - taskData.timestamp < 24 * 60 * 60 * 1000;

        if (isRecent) {
          console.log("Found active task in localStorage:", taskData);
          setJobTitle(taskData.jobTitle);
          setActiveTraceId(taskData.traceId);
          setIsLoading(true);
          setStatusMessage(taskData.statusMessage || "Resuming task...");
          setCancelRequested(taskData.cancelRequested);

          // Resume polling for the active task
          startPollingForResult(taskData.traceId);
        } else {
          // Task is older than 24 hours, probably completed already
          console.log("Found stale task in localStorage, removing it");
          localStorage.removeItem(ACTIVE_TASK_KEY);
        }
      } catch (error) {
        console.error("Error parsing stored task data:", error);
        localStorage.removeItem(ACTIVE_TASK_KEY);
      }
    }
  }, []);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        console.log("Cleaned up polling interval on unmount");
      }
    };
  }, [pollingIntervalId]);

  // Save active task to localStorage
  const saveTaskToLocalStorage = (traceId: string, currentJobTitle: string, currentStatus: string | null, isCancelling: boolean) => {
    const taskData: StoredTaskData = {
      traceId,
      jobTitle: currentJobTitle,
      timestamp: Date.now(),
      statusMessage: currentStatus,
      cancelRequested: isCancelling
    };

    localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(taskData));
    console.log("Saved task to localStorage:", taskData);
  };

  // Update the stored task status
  const updateStoredTaskStatus = (status: string | null, isCancelling: boolean = false) => {
    if (!activeTraceId) return;

    const storedTaskData = localStorage.getItem(ACTIVE_TASK_KEY);
    if (storedTaskData) {
      try {
        const taskData: StoredTaskData = JSON.parse(storedTaskData);
        taskData.statusMessage = status;
        taskData.timestamp = Date.now();
        if (isCancelling !== undefined) {
          taskData.cancelRequested = isCancelling;
        }

        localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(taskData));
        console.log("Updated stored task status:", status);
      } catch (error) {
        console.error("Error updating stored task status:", error);
      }
    }
  };

  const startPollingForResult = (traceId: string) => {
    // Prevent multiple polling loops
    if (pollingRef.current) {
      console.log("Polling already active for", traceId);
      return;
    }
    pollingRef.current = true;
    console.log("Starting polling for result:", traceId);
    setStatusMessage("Processing request... Polling for results.");
    updateStoredTaskStatus("Processing request... Polling for results.");

    const poll = async () => {
      if (!pollingRef.current) return; // Stop if polling was cancelled externally
      console.log(`Polling for ${traceId}...`);

      // Get current cancelRequested status from localStorage to ensure we have the latest value
      let isCancelRequested = cancelRequested;
      try {
        const storedTaskData = localStorage.getItem(ACTIVE_TASK_KEY);
        if (storedTaskData) {
          const taskData: StoredTaskData = JSON.parse(storedTaskData);
          isCancelRequested = taskData.cancelRequested;
        }
      } catch (error) {
        console.error("Error reading cancellation status from localStorage:", error);
      }

      try {
        const response = await fetch(`http://localhost:8000/tasks/result/${traceId}`);

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Task ${traceId} not found (likely finished or error). Stopping poll.`);

            // Stop polling immediately
            if (pollingIntervalId) {
              clearInterval(pollingIntervalId);
              setPollingIntervalId(null);
              pollingRef.current = false;
            }

            // Check if this was a cancellation request
            if (isCancelRequested) {
              resetApplicationState();
              toast({
                title: "Application Cancelled",
                description: "The application has been successfully cancelled.",
              });
            } else {
              resetApplicationState();
              toast({
                title: "Task Not Found",
                description: "The task could not be found. It might have finished or encountered an error.",
                variant: "destructive",
              });
            }
            return; // Stop this poll execution
          } else {
            console.error(`Polling error: ${response.status}`);
            const statusMsg = `Polling error: ${response.status}. Retrying...`;
            setStatusMessage(statusMsg);
            updateStoredTaskStatus(statusMsg);
          }
          return; // Continue polling on non-404 errors
        }

        const data = await response.json();
        console.log("Polling result:", data);

        switch (data.status) {
          case "pending":
            const statusMsg = "Task is still processing...";
            setStatusMessage(statusMsg);
            updateStoredTaskStatus(statusMsg);
            // Continue polling
            break;
          case "completed":
            resetApplicationState();
            toast({
              title: "Application Submitted",
              description: data.result || `Your application for ${jobTitle} jobs has been submitted successfully.`,
            });
            break;
          case "cancelled":
            resetApplicationState();
            toast({
              title: "Application Cancelled",
              description: data.result || "The application process was cancelled.",
            });
            break;
          case "failed":
            resetApplicationState();
            toast({
              title: "Application Failed",
              description: data.result || `An error occurred during the application process.`,
              variant: "destructive",
            });
            break;
          default:
            console.error("Unknown task status:", data.status);
            setStatusMessage(`Unknown task status: ${data.status}. Stopping poll.`);
            resetApplicationState();
        }
      } catch (error) {
        console.error("Polling fetch error:", error);
        const statusMsg = "Error during polling. Retrying...";
        setStatusMessage(statusMsg);
        updateStoredTaskStatus(statusMsg);
        // Continue polling after a network error
      }
    };

    // Initial poll
    poll();
    // Set up interval
    const intervalId = setInterval(poll, 3000); // Poll every 3 seconds
    setPollingIntervalId(intervalId);
  };

  const resetApplicationState = () => {
    console.log("Resetting application state");
    // Clear localStorage data
    localStorage.removeItem(ACTIVE_TASK_KEY);

    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      pollingRef.current = false;
    }
    setIsLoading(false);
    setActiveTraceId(null);
    setStatusMessage(null);
    setCancelRequested(false);
  };

  // Simplified this - now just force resets
  const forceResetApplicationState = () => {
    console.log("Forcing application state reset");
    resetApplicationState();
    toast({
      title: "Application Reset",
      description: "The application state has been reset.",
    });
  };

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
      setStatusMessage("Sending application request...");
      setCancelRequested(false);
      setActiveTraceId(null); // Clear previous trace ID if any
      if (pollingIntervalId) clearInterval(pollingIntervalId); // Clear previous polling
      pollingRef.current = false;

      try {
        const taskString = `"${jobTitle}".`;

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

        if (response.status !== 202) { // Check for 202 Accepted
          const errorText = await response.text();
          throw new Error(`Error starting task: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Orchestrate response:", data);

        if (data.trace_id) {
          setActiveTraceId(data.trace_id);
          // Save task information to localStorage
          saveTaskToLocalStorage(data.trace_id, jobTitle, "Processing request... Starting application.", false);
          // Start polling for results
          startPollingForResult(data.trace_id);
        } else {
          throw new Error("Backend did not return a trace_id");
        }

      } catch (error) {
        console.error("Error initiating application:", error);
        toast({
          title: "Application Initiation Failed",
          description: `${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
        resetApplicationState(); // Reset UI on initiation failure
      }
      // Note: setIsLoading(false) is now handled by resetApplicationState
    };

  const cancelApplication = async () => {
    if (!activeTraceId) {
      console.error("No active trace ID to cancel");
      return;
    }

    // Stop the results polling first
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      pollingRef.current = false;
    }

    const statusMsg = "Sending cancellation request...";
    setStatusMessage(statusMsg);
    setCancelRequested(true);
    // Update localStorage with cancellation status
    updateStoredTaskStatus(statusMsg, true);

    console.log("Sending cancellation request for trace_id:", activeTraceId);

    try {
      const response = await fetch("http://localhost:8000/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ trace_id: activeTraceId })
      });

      console.log(`Cancel response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error during cancel: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Cancel response data:", data);

      if (data.success) {
        const statusMsg = "Cancellation queued. Waiting for background process...";
        setStatusMessage(statusMsg);
        updateStoredTaskStatus(statusMsg, true);

        // Log successful cancellation request
        console.log("Cancellation request was successful, restarting polling to confirm completion");

        // Show intermediate toast
        toast({
          title: "Cancellation Requested",
          description: "Cancellation request was sent. Waiting for the process to complete...",
        });

        // Restart polling to confirm cancellation completion
        startPollingForResult(activeTraceId);
      } else {
        const statusMsg = "Cancellation request failed.";
        setStatusMessage(statusMsg);
        setCancelRequested(false); // Allow retry or force kill
        updateStoredTaskStatus(statusMsg, false);
        toast({
          title: "Cancellation Failed",
          description: data.message || "Failed to queue cancellation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      const statusMsg = "Cancellation error.";
      setStatusMessage(statusMsg);
      setCancelRequested(false); // Allow retry or force kill
      updateStoredTaskStatus(statusMsg, false);
      toast({
        title: "Cancellation Failed",
        description: `Error sending cancel request: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const forceKillApplication = async () => {
    if (!activeTraceId) {
      console.error("No active trace ID to kill");
      return;
    }

    // Stop any active polling
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      pollingRef.current = false;
    }

    const statusMsg = "Sending force kill request...";
    setStatusMessage(statusMsg);
    setCancelRequested(true); // Mark as attempting termination
    updateStoredTaskStatus(statusMsg, true);
    console.log("Sending force kill request for trace_id:", activeTraceId);

    try {
      const response = await fetch("http://localhost:8000/kill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ trace_id: activeTraceId, force: true })
      });

      console.log(`Force kill response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error during kill: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Force kill response:", data);

      if (data.success) {
        setStatusMessage("Force kill queued. Resetting UI.");
        toast({ title: "Termination Queued", description: data.message });
      } else {
        setStatusMessage("Force kill request failed.");
        toast({
          title: "Force Kill Failed",
          description: data.message || "Failed to queue force kill.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Force kill error:", error);
      setStatusMessage("Force kill error.");
      toast({
        title: "Force Kill Error",
        description: `Error sending kill request: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      // Reset UI immediately after force kill attempt
      resetApplicationState();
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
                      {isLoading && (
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
                                onClick={cancelApplication}
                                disabled={cancelRequested}
                                className="h-8 px-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                {cancelRequested ? "Cancelling..." : "Cancel"}
                              </Button>
                              {cancelRequested && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={forceKillApplication}
                                  className="h-8 px-2 text-red-700 hover:text-red-900 hover:bg-red-100"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Force Kill
                                </Button>
                              )}
                            </div>
                          </div>
                          <AlertDescription>{statusMessage || "Please wait..."}</AlertDescription>
                          {activeTraceId && (
                            <div className="mt-2 text-xs text-gray-500">
                              Task ID: {activeTraceId}
                            </div>
                          )}
                        </Alert>
                      )}

                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">What jobs would you like to apply to today?</h2>
                        <Textarea
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="min-h-[100px]"
                          placeholder="Describe the jobs you're looking for..."
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Suggestions for You (click to use):</p>
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