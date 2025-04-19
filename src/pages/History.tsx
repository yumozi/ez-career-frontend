import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import {
    FaCalendarAlt, FaBriefcase, FaSearch, FaFilter,
    FaCheck, FaTimes, FaChevronRight, FaCircle
} from "react-icons/fa";

// Define application status options with styling
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
    updated_at: string;
    link?: string;
    notes?: string;
}

interface ActivityLog {
    id: string;
    user_id: string;
    application_id: string;
    action_type: 'created' | 'status_updated' | 'note_added' | 'detail_updated';
    previous_status?: string;
    new_status?: string;
    created_at: string;
    details?: string;
    position_title?: string;
    company_name?: string;
}

export default function History() {
    const { user } = useAuth();
    const [applicationHistory, setApplicationHistory] = useState<ActivityLog[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [timeFilter, setTimeFilter] = useState<string>('all');

    // Function to fetch applications and activity logs
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                setIsLoading(true);

                // Fetch all applications for the current user
                const { data: applicationsData, error: applicationsError } = await supabase
                    .from('applications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('applied_at', { ascending: false });

                if (applicationsError) {
                    console.error('Error fetching applications:', applicationsError);
                    // Just set empty applications and continue
                    setApplications([]);
                } else {
                    setApplications(applicationsData || []);
                }

                try {
                    // Try to fetch activity logs, but handle 404/missing table gracefully
                    const { data: activityData, error: activityError } = await supabase
                        .from('application_activity')
                        .select(`
                            id, user_id, application_id, action_type,
                            previous_status, new_status, created_at, details,
                            applications(position_title, company_name)
                        `)
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (activityError) {
                        console.error('Error fetching activity logs:', activityError);
                        // Just set empty history instead of showing error toast
                        setApplicationHistory([]);
                        return;
                    }

                    // Transform activity data to include application details
                    const transformedData = activityData?.map(activity => {
                        // Safely access the nested properties
                        const applications = activity.applications as unknown;
                        let positionTitle = 'Unknown Position';
                        let companyName = 'Unknown Company';

                        // Type guards to safely access properties
                        if (applications && typeof applications === 'object') {
                            const appObj = applications as { [key: string]: unknown };
                            if (appObj.position_title && typeof appObj.position_title === 'string') {
                                positionTitle = appObj.position_title;
                            }
                            if (appObj.company_name && typeof appObj.company_name === 'string') {
                                companyName = appObj.company_name;
                            }
                        }

                        return {
                            ...activity,
                            position_title: positionTitle,
                            company_name: companyName,
                        };
                    }) || [];

                    setApplicationHistory(transformedData);
                } catch (error) {
                    console.error('Error processing activity data:', error);
                    setApplicationHistory([]);
                }
            } catch (error) {
                console.error('Error in fetchData:', error);
                // Don't show a toast for database errors, just show empty state
                setApplications([]);
                setApplicationHistory([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // Filter activity logs based on search query and filters
    const filteredHistory = applicationHistory.filter(activity => {
        // Search query filter
        const matchesSearch =
            searchQuery === '' ||
            activity.position_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.details?.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus =
            statusFilter === 'all' ||
            activity.new_status === statusFilter;

        // Time filter
        const activityDate = new Date(activity.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

        const matchesTime =
            timeFilter === 'all' ||
            (timeFilter === 'week' && daysDiff <= 7) ||
            (timeFilter === 'month' && daysDiff <= 30) ||
            (timeFilter === 'quarter' && daysDiff <= 90);

        return matchesSearch && matchesStatus && matchesTime;
    });

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Format time for display
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format relative time for display
    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 172800) return 'Yesterday';
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;

        return formatDate(dateString);
    };

    // Function to get status badge
    const getStatusBadge = (status?: string) => {
        if (!status) return null;

        const badgeClass = STATUS_STYLES[status as keyof typeof STATUS_STYLES] || "bg-gray-100 text-gray-800";

        return (
            <Badge className={badgeClass}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    // Group activities by date
    const groupActivitiesByDate = (activities: ActivityLog[]) => {
        const groups: { [key: string]: ActivityLog[] } = {};

        activities.forEach(activity => {
            const date = new Date(activity.created_at).toLocaleDateString('en-US');

            if (!groups[date]) {
                groups[date] = [];
            }

            groups[date].push(activity);
        });

        return Object.entries(groups).map(([date, activities]) => ({
            date,
            formattedDate: formatDate(new Date(date).toISOString()),
            activities
        }));
    };

    // Get appropriate icon for activity type
    const getActivityIcon = (activity: ActivityLog) => {
        switch (activity.action_type) {
            case 'created':
                return <FaBriefcase className="h-4 w-4 text-blue-500" />;
            case 'status_updated':
                if (activity.new_status === 'accepted') {
                    return <FaCheck className="h-4 w-4 text-green-500" />;
                } else if (activity.new_status === 'rejected') {
                    return <FaTimes className="h-4 w-4 text-red-500" />;
                } else {
                    return <FaChevronRight className="h-4 w-4 text-amber-500" />;
                }
            case 'note_added':
                return <FaCircle className="h-2 w-2 text-blue-500" />;
            case 'detail_updated':
                return <FaCircle className="h-2 w-2 text-purple-500" />;
            default:
                return <FaCircle className="h-2 w-2 text-gray-500" />;
        }
    };

    // Get activity description
    const getActivityDescription = (activity: ActivityLog) => {
        switch (activity.action_type) {
            case 'created':
                return `Applied to ${activity.position_title} at ${activity.company_name}`;
            case 'status_updated':
                return `Status changed from ${activity.previous_status || 'Unknown'} to ${activity.new_status || 'Unknown'} for ${activity.position_title} at ${activity.company_name}`;
            case 'note_added':
                return `Added note to ${activity.position_title} at ${activity.company_name}: ${activity.details || ''}`;
            case 'detail_updated':
                return `Updated details for ${activity.position_title} at ${activity.company_name}: ${activity.details || ''}`;
            default:
                return `Activity on ${activity.position_title} at ${activity.company_name}`;
        }
    };

    // Group the filtered activities by date
    const groupedActivities = groupActivitiesByDate(filteredHistory);

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-background flex w-full">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <main className="flex-1 pb-10">
                        <div className="container mt-8 px-4 sm:px-6">
                            <div className="mb-6">
                                <h1 className="text-3xl font-bold tracking-tight">Application History</h1>
                                <p className="text-muted-foreground mt-1">Track the history and progress of your job applications</p>
                            </div>

                            <div className="flex flex-col gap-6">
                                {/* Filters section */}
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="col-span-2">
                                                <div className="relative">
                                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                                    <Input
                                                        placeholder="Search by company, position, or details..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Filter by status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Statuses</SelectItem>
                                                        <SelectItem value="applied">Applied</SelectItem>
                                                        <SelectItem value="assessment">Assessment</SelectItem>
                                                        <SelectItem value="interview">Interview</SelectItem>
                                                        <SelectItem value="accepted">Accepted</SelectItem>
                                                        <SelectItem value="rejected">Rejected</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Select value={timeFilter} onValueChange={setTimeFilter}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Filter by time" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Time</SelectItem>
                                                        <SelectItem value="week">Past Week</SelectItem>
                                                        <SelectItem value="month">Past Month</SelectItem>
                                                        <SelectItem value="quarter">Past 3 Months</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Timeline section */}
                                <Card>
                                    <CardContent className="p-0">
                                        <div className="p-4 border-b">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-lg font-medium">Activity Timeline</h2>
                                                <div className="flex items-center gap-2">
                                                    <FaCalendarAlt className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {filteredHistory.length} activities
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <ScrollArea className="h-[calc(100vh-300px)]">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center h-40">
                                                    <p className="text-muted-foreground">Loading activity history...</p>
                                                </div>
                                            ) : filteredHistory.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-40">
                                                    <FaCalendarAlt className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                                                    <p className="text-muted-foreground">No activity history found</p>
                                                    {searchQuery || statusFilter !== 'all' || timeFilter !== 'all' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSearchQuery('');
                                                                setStatusFilter('all');
                                                                setTimeFilter('all');
                                                            }}
                                                            className="mt-2"
                                                        >
                                                            Clear filters
                                                        </Button>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground mt-2">
                                                            Start applying to jobs to build your history
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="divide-y">
                                                    {groupedActivities.map((group) => (
                                                        <div key={group.date} className="p-0">
                                                            <div className="bg-accent/10 px-4 py-2 sticky top-0">
                                                                <h3 className="font-medium text-sm">{group.formattedDate}</h3>
                                                            </div>

                                                            <div className="divide-y">
                                                                {group.activities.map((activity) => (
                                                                    <div key={activity.id} className="p-4 hover:bg-accent/5">
                                                                        <div className="flex items-start gap-4">
                                                                            <div className="mt-1 flex-shrink-0">
                                                                                {getActivityIcon(activity)}
                                                                            </div>

                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex justify-between items-start">
                                                                                    <div>
                                                                                        <h4 className="font-medium">
                                                                                            {activity.position_title} - {activity.company_name}
                                                                                        </h4>
                                                                                        <p className="text-sm text-muted-foreground mt-1">
                                                                                            {getActivityDescription(activity)}
                                                                                        </p>
                                                                                    </div>

                                                                                    <div className="text-right ml-4 flex-shrink-0">
                                                                                        <span className="text-xs text-muted-foreground block">
                                                                                            {formatTime(activity.created_at)}
                                                                                        </span>
                                                                                        <span className="text-xs text-muted-foreground block mt-1">
                                                                                            {formatRelativeTime(activity.created_at)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="mt-2 flex items-center gap-2">
                                                                                    {activity.action_type === 'status_updated' && (
                                                                                        <>
                                                                                            {getStatusBadge(activity.previous_status)}
                                                                                            <FaChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
                                                                                            {getStatusBadge(activity.new_status)}
                                                                                        </>
                                                                                    )}

                                                                                    {activity.action_type === 'created' && (
                                                                                        getStatusBadge(activity.new_status || 'applied')
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </ScrollArea>
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