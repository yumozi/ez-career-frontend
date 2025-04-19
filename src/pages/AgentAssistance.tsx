import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { FaExclamationTriangle, FaCheckCircle, FaClock } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

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
            const { error } = await supabase
                .from('application_issues')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolution_note: resolutionNote
                })
                .eq('id', selectedIssue.id);

            if (error) {
                throw error;
            }

            toast({
                title: "Issue Resolved",
                description: "The application can now continue processing",
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

    const getPendingIssues = () => issues.filter(issue => issue.status === 'pending');
    const getResolvedIssues = () => issues.filter(issue => issue.status === 'resolved');

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
                        <Badge variant={issue.status === 'pending' ? 'destructive' : 'secondary'}>
                            {issue.status === 'pending' ? 'Needs Attention' : 'Resolved'}
                        </Badge>
                    </div>
                    <CardDescription>Created: {formatDate(issue.created_at)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="font-medium">{issue.issue_type}</p>
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
                                    <h1 className="text-3xl font-bold tracking-tight">Agent Assistance</h1>
                                    <p className="text-muted-foreground">
                                        Resolve issues that require your input to continue application processes
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
                                        <Tabs defaultValue="pending">
                                            <TabsList className="grid w-full grid-cols-2 mb-4">
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
                                            <TabsContent value="pending" className="mt-0">
                                                {renderIssueList(getPendingIssues())}
                                            </TabsContent>
                                            <TabsContent value="resolved" className="mt-0">
                                                {renderIssueList(getResolvedIssues())}
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    <div className="lg:col-span-2">
                                        {selectedIssue ? (
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex justify-between items-center">
                                                        <CardTitle>{selectedIssue.position} at {selectedIssue.company}</CardTitle>
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
                                                        <h3 className="text-lg font-medium mb-2">Issue Details</h3>
                                                        <Alert variant="destructive" className="mb-4">
                                                            <FaExclamationTriangle className="h-4 w-4" />
                                                            <AlertTitle>{selectedIssue.issue_type}</AlertTitle>
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
                                                                <h3 className="text-lg font-medium mb-2">Resolve Issue</h3>
                                                                <p className="text-sm text-muted-foreground mb-4">
                                                                    Provide resolution details before marking this issue as resolved.
                                                                </p>
                                                                <Textarea
                                                                    placeholder="Describe how you've resolved this issue..."
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
                                                        <Button
                                                            onClick={handleResolveIssue}
                                                            disabled={!resolutionNote.trim()}
                                                        >
                                                            Mark as Resolved
                                                        </Button>
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
        </SidebarProvider>
    );
} 