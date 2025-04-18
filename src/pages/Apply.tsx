import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();

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
      
      toast({
        title: "Application Submitted",
        description: `Your application for ${jobTitle} jobs has been submitted successfully.`,
      });
    } catch (error) {
      console.error("Application error:", error);
      toast({
        title: "Application Failed",
        description: `Failed to submit application: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
                      <div className="flex flex-wrap items-center gap-2 text-lg">
                        <span>I want to apply to</span>
                        <Input
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="w-64 inline-flex"
                          placeholder="Enter job title"
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