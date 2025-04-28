import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FaExclamationTriangle, FaCheckCircle, FaClock, FaRedo } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type IssueStatus = "pending" | "resolved";

interface ApplicationIssue {
    id: string;
    application_id: string;
    company: string;
    position: string;
    issue_type: string;
    issue_details: string;
    status: IssueStatus;
    created_at: string;
    resolved_at: string | null;
    resolution_note?: string;
}

export default function AgentAssistance() {
    const [issues, setIssues] = useState<ApplicationIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<ApplicationIssue | null>(null);
    const [resolutionNote, setResolutionNote] = useState("");
    const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
    const [additionalInfo, setAdditionalInfo] = useState<Record<string, string>>({});
    const [reprocessing, setReprocessing] = useState(false);
    const [displayedIssueTypes] = useState<string[]>(["missing_information"]);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('application_issues')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            setIssues(data || []);
        } catch (error) {
            console.error('Error fetching issues:', error);
            toast({
                title: "Error",
                description: "Failed to load application issues",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResolveIssue = async () => {
        if (!selectedIssue) return;

        try {
            // Get the backend URL from env var or use default
            const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
            
            // Generate embedding for issue_details
            const embeddingResponse = await fetch(`${backendUrl}/embedding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedIssue.issue_details
                }),
            });

            if (!embeddingResponse.ok) {
                throw new Error('Failed to generate embedding for issue details');
            }

            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.embedding;

            // Update Supabase with the embedding and other fields
            const { error } = await supabase
                .from('application_issues')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolution_note: resolutionNote,
                    embedding: embedding
                })
                .eq('id', selectedIssue.id);

            if (error) {
                throw error;
            }

            toast({
                title: "Question Answered",
                description: "This will help the agent process applications more smoothly in the future.",
            });

            fetchIssues();
            setSelectedIssue(null);
            setResolutionNote("");
        } catch (error) {
            console.error('Error resolving issue:', error);
            toast({
                title: "Error",
                description: "Failed to resolve the issue",
                variant: "destructive",
            });
        }
    };

    // New function to reprocess an application
    const handleReprocessApplication = async () => {
        if (!selectedIssue) return;

        try {
            setReprocessing(true);

            const response = await fetch('/api/reprocess_application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    issue_id: selectedIssue.id,
                    additional_info: additionalInfo
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to reprocess application');
            }

            const data = await response.json();

            toast({
                title: "Application Reprocessing Started",
                description: `The agent will try to complete this application with the information you provided.`,
            });

            // Reset states and fetch fresh data
            setReprocessDialogOpen(false);
            setAdditionalInfo({});
            fetchIssues();

        } catch (error) {
            console.error('Error reprocessing application:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to reprocess application",
                variant: "destructive",
            });
        } finally {
            setReprocessing(false);
        }
    };

    // Helper to extract missing information needs from issue details
    const extractMissingFields = (issueDetails: string): string[] => {
        const missingFields: string[] = [];

        // Common patterns in issue details text
        const patterns = [
            /missing (?:information|field|data)(?: for)?: ([^.]+)/i,
            /required field ([^.]+) is (?:missing|empty|not provided)/i,
            /need(?:s|ed)? (?:to provide|information about) ([^.]+)/i,
            /could not find ([^.]+) in (?:user|profile) (?:data|information)/i
        ];

        for (const pattern of patterns) {
            const match = issueDetails.match(pattern);
            if (match && match[1]) {
                // Clean up the field name and add to list
                const fieldName = match[1].trim().replace(/^(the|your) /i, '');
                missingFields.push(fieldName);
            }
        }

        // If no structured fields found, return a default
        if (missingFields.length === 0 && issueDetails.toLowerCase().includes('missing')) {
            missingFields.push('Additional information');
        }

        return missingFields;
    };

    const handleInputChange = (field: string, value: string) => {
        setAdditionalInfo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const openReprocessDialog = () => {
        if (selectedIssue) {
            // Reset additional info
            setAdditionalInfo({});
            setReprocessDialogOpen(true);
        }
    };

    const getPendingIssues = () => issues.filter(issue => issue.status === 'pending' && displayedIssueTypes.includes(issue.issue_type));
    const getResolvedIssues = () => issues.filter(issue => issue.status === 'resolved' && displayedIssueTypes.includes(issue.issue_type));

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderIssueList = (filteredIssues: ApplicationIssue[]) => {
        if (filteredIssues.length === 0) {
            return (
                <div className="p-4 text-center text-muted-foreground">
                    No issues found
                </div>
            );
        }

        return filteredIssues.map(issue => (
            <Card
                key={issue.id}
                className={`mb-4 cursor-pointer hover:bg-accent/50 ${selectedIssue?.id === issue.id ? 'border-primary' : ''}`}
                onClick={() => setSelectedIssue(issue)}
            >
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{issue.position} at {issue.company}</CardTitle>
                    </div>
                    <CardDescription>{formatDate(issue.created_at)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{issue.issue_details}</p>
                </CardContent>
            </Card>
        ));
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-background flex w-full">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <main className="flex-1 pb-10">
                        <div className="container mt-8 px-4 sm:px-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Agent Questions</h1>
                                    <p className="text-muted-foreground">
                                        Your agent found questions it couldn't answer. Help fill in the missing info to improve future applications.
                                    </p>
                                </div>
                                <Button onClick={fetchIssues} variant="outline">Refresh</Button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="text-center">
                                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p>Loading issues...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1">
                                        <Tabs defaultValue="pending" className="flex flex-col h-full">
                                            <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10">
                                                <TabsTrigger value="pending">
                                                    <div className="flex items-center gap-2">
                                                        <FaExclamationTriangle className="h-4 w-4" />
                                                        <span>Pending ({getPendingIssues().length})</span>
                                                    </div>
                                                </TabsTrigger>
                                                <TabsTrigger value="resolved">
                                                    <div className="flex items-center gap-2">
                                                        <FaCheckCircle className="h-4 w-4" />
                                                        <span>Resolved ({getResolvedIssues().length})</span>
                                                    </div>
                                                </TabsTrigger>
                                            </TabsList>
                                            <div className="overflow-y-auto h-[calc(100vh-220px)]">
                                                <TabsContent value="pending" className="mt-0 h-full">
                                                    {renderIssueList(getPendingIssues())}
                                                </TabsContent>
                                                <TabsContent value="resolved" className="mt-0 h-full">
                                                    {renderIssueList(getResolvedIssues())}
                                                </TabsContent>
                                            </div>
                                        </Tabs>
                                    </div>

                                    <div className="lg:col-span-2">
                                        {selectedIssue ? (
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex justify-between items-center">
                                                        <CardTitle className="text-2xl max-w-[70%] pr-2">{selectedIssue.position} at {selectedIssue.company}</CardTitle>
                                                        <Badge variant={selectedIssue.status === 'pending' ? 'destructive' : 'secondary'}>
                                                            {selectedIssue.status === 'pending' ? 'Needs Attention' : 'Resolved'}
                                                        </Badge>
                                                    </div>
                                                    <CardDescription>
                                                        <div className="flex items-center gap-1">
                                                            <FaClock className="h-3 w-3" />
                                                            <span>{formatDate(selectedIssue.created_at)}</span>
                                                        </div>
                                                        {selectedIssue.resolved_at && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <FaCheckCircle className="h-3 w-3" />
                                                                <span>Resolved: {formatDate(selectedIssue.resolved_at)}</span>
                                                            </div>
                                                        )}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="mb-4">
                                                        <h3 className="text-lg font-medium mb-2">Question Details</h3>
                                                        <Alert variant="destructive" className="mb-4">
                                                            <FaExclamationTriangle className="h-4 w-4" />
                                                            <AlertDescription>
                                                                {selectedIssue.issue_details}
                                                            </AlertDescription>
                                                        </Alert>

                                                        {selectedIssue.status === 'resolved' && selectedIssue.resolution_note && (
                                                            <div className="mt-4">
                                                                <h3 className="text-lg font-medium mb-2">Resolution</h3>
                                                                <Alert>
                                                                    <FaCheckCircle className="h-4 w-4" />
                                                                    <AlertTitle>Issue Resolved</AlertTitle>
                                                                    <AlertDescription>
                                                                        {selectedIssue.resolution_note}
                                                                    </AlertDescription>
                                                                </Alert>
                                                            </div>
                                                        )}

                                                        {selectedIssue.status === 'pending' && (
                                                            <div className="mt-6">
                                                                <h3 className="text-lg font-medium mb-2">Answer Question</h3>
                                                                <p className="text-sm text-muted-foreground mb-4">
                                                                    Provide the necessary information and mark this question as resolved.
                                                                </p>
                                                                <Textarea
                                                                    placeholder="Describe any information relevant to the question..."
                                                                    className="min-h-[120px]"
                                                                    value={resolutionNote}
                                                                    onChange={(e) => setResolutionNote(e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="flex justify-between">
                                                    <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                                                        Back to List
                                                    </Button>
                                                    {selectedIssue.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={handleResolveIssue}
                                                                disabled={!resolutionNote.trim()}
                                                            >
                                                                Mark as Resolved
                                                            </Button>
                                                            <Button
                                                                onClick={openReprocessDialog}
                                                                variant="secondary"
                                                            >
                                                                <FaRedo className="mr-2 h-4 w-4" />
                                                                Reprocess
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardFooter>
                                            </Card>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center p-12 border rounded-lg border-dashed max-w-md">
                                                    <FaExclamationTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                                    <h3 className="text-lg font-medium mb-2">No Issue Selected</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Select an issue from the list to view details and resolve it.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Reprocess Dialog */}
            <Dialog open={reprocessDialogOpen} onOpenChange={setReprocessDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Reprocess Application</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Provide the missing information needed to reprocess this application.
                            The agent will attempt to complete the application with this additional data.
                        </p>

                        {selectedIssue && extractMissingFields(selectedIssue.issue_details).map((field, index) => (
                            <div key={index} className="mb-4">
                                <label htmlFor={`field-${index}`} className="block text-sm font-medium mb-1">
                                    {field}
                                </label>
                                <Input
                                    id={`field-${index}`}
                                    placeholder={`Enter ${field.toLowerCase()}`}
                                    value={additionalInfo[field] || ''}
                                    onChange={(e) => handleInputChange(field, e.target.value)}
                                />
                            </div>
                        ))}

                        <div className="mb-4">
                            <label htmlFor="additional-notes" className="block text-sm font-medium mb-1">
                                Additional Notes
                            </label>
                            <Textarea
                                id="additional-notes"
                                placeholder="Any other information that might help"
                                value={additionalInfo['notes'] || ''}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReprocessDialogOpen(false)}
                            disabled={reprocessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReprocessApplication}
                            disabled={reprocessing || Object.keys(additionalInfo).length === 0}
                        >
                            {reprocessing ? (
                                <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <FaRedo className="mr-2 h-4 w-4" />
                                    Start Reprocessing
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
} 