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
  loopCount?: number; // Track completed task count
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
  const loopCountRef = useRef(0); // Track completed tasks

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
          loopCountRef.current = taskData.loopCount || 0; // Restore loop count

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
      cancelRequested: isCancelling,
      loopCount: loopCountRef.current // Save loop count
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
        taskData.loopCount = loopCountRef.current; // Update loop count

        localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(taskData));
        console.log("Updated stored task status:", status);
      } catch (error) {
        console.error("Error updating stored task status:", error);
      }
    }
  };

  // Update loop count in localStorage independently
  const updateLoopCount = () => {
    if (!activeTraceId) return;

    const storedTaskData = localStorage.getItem(ACTIVE_TASK_KEY);
    if (storedTaskData) {
      try {
        const taskData: StoredTaskData = JSON.parse(storedTaskData);
        taskData.loopCount = loopCountRef.current;
        localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(taskData));
        console.log("Updated loop count in localStorage:", loopCountRef.current);
      } catch (error) {
        console.error("Error updating loop count in localStorage:", error);
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
    setStatusMessage("Processing request...");
    updateStoredTaskStatus("Processing request...");

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
              resetApplicationState(false); // Don't restart on cancellation
              toast({
                title: "Application Cancelled",
                description: "The application has been successfully cancelled.",
              });
            } else {
              resetApplicationState(); // May restart if autoLoop is true
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
            const statusMsg = "Processing task...";
            setStatusMessage(statusMsg);
            updateStoredTaskStatus(statusMsg);
            // Continue polling
            break;
          case "completed":
            loopCountRef.current += 1; // Increment loop counter
            updateLoopCount(); // Save updated loop count to localStorage
            const shouldRestart = !isCancelRequested;
            
            // Clear current state but restart if not canceled
            resetApplicationState(shouldRestart);
            
            toast({
              title: "Application Submitted",
              description: data.result || `Your application for ${jobTitle} jobs has been submitted successfully.`,
            });
            break;
          case "cancelled":
            resetApplicationState(false); // Don't restart on cancellation
            toast({
              title: "Application Cancelled",
              description: data.result || "The application process was cancelled.",
            });
            break;
          case "failed":
            resetApplicationState(false); // Don't restart on failure
            toast({
              title: "Application Failed",
              description: data.result || `An error occurred during the application process.`,
              variant: "destructive",
            });
            break;
          default:
            console.error("Unknown task status:", data.status);
            setStatusMessage(`Unknown task status: ${data.status}. Stopping poll.`);
            resetApplicationState(false); // Don't restart on unknown status
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

  const resetApplicationState = (shouldRestartTask = true) => {
    console.log("Resetting application state", shouldRestartTask ? "(with auto-restart)" : "");
    // Clear localStorage data
    localStorage.removeItem(ACTIVE_TASK_KEY);

    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      pollingRef.current = false;
    }
    
    // If we're not restarting, fully reset the UI
    if (!shouldRestartTask) {
      setIsLoading(false);
      setActiveTraceId(null);
      setStatusMessage(null);
      setCancelRequested(false);
      loopCountRef.current = 0;
      return;
    }
    
    // For auto-restart, we keep the job title and initiate a new task after a small delay
    setTimeout(() => {
      console.log(`Auto-restarting task (count: ${loopCountRef.current})`);
      handleApply();
    }, 1500);
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
          saveTaskToLocalStorage(data.trace_id, jobTitle, "Processing request...", false);
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
                          <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <div className="bg-blue-100 p-2 rounded-full mr-3">
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                </div>
                                <div>
                                  <div className="flex items-center">
                                    <AlertTitle className="text-blue-700 font-medium">Processing Applications</AlertTitle>
                                  </div>
                                  <AlertDescription className="text-blue-600 mt-1">
                                    {statusMessage || "Please wait..."}
                                  </AlertDescription>
                                </div>
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
                            
                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-blue-200">
                              <div className="text-gray-500 text-xs flex items-center">
                                {activeTraceId && (
                                  <>
                                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-l-md">Task #{loopCountRef.current + 1}</span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-r-md">ID: {activeTraceId}</span>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <span className="relative flex h-2 w-2 mr-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                  Auto-looping
                                </span>
                              </div>
                            </div>
                          </div>
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