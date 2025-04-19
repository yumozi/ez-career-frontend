import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    FaBell, FaCheck, FaFilter, FaTrash, FaCheckDouble,
    FaBriefcase, FaCalendarAlt, FaInfoCircle, FaExclamationTriangle
} from "react-icons/fa";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define types
interface Notification {
    id: string;
    user_id: string;
    title: string;
    content: string;
    type: 'application' | 'interview' | 'reminder' | 'alert';
    read: boolean;
    created_at: string;
    reference_id?: string;
    reference_type?: 'application' | 'interview';
}

export default function Notifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>("all");

    // Filter types
    const getFilteredNotifications = () => {
        if (activeTab === "all") {
            return notifications;
        } else if (activeTab === "unread") {
            return notifications.filter((notification) => !notification.read);
        } else {
            return notifications.filter((notification) => notification.type === activeTab);
        }
    };

    const fetchNotifications = async () => {
        if (!user) return;

        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                // Silently handle database errors by setting empty notifications
                console.error('Error fetching notifications:', error);
                setNotifications([]);
                return;
            }

            setNotifications(data || []);
        } catch (error) {
            console.error('Error in fetchNotifications:', error);
            // Don't show toast for database errors, just set empty state
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);

            if (error) {
                console.error('Error marking notification as read:', error);
                return;
            }

            // Update local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === id
                        ? { ...notification, read: true }
                        : notification
                )
            );
        } catch (error) {
            console.error('Error in markAsRead:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user?.id);

            if (error) {
                console.error('Error marking all notifications as read:', error);
                toast({
                    title: "Error",
                    description: "Failed to mark all notifications as read",
                    variant: "destructive",
                });
                return;
            }

            // Update local state
            setNotifications(prev =>
                prev.map(notification => ({ ...notification, read: true }))
            );

            toast({
                title: "Success",
                description: "All notifications marked as read",
            });
        } catch (error) {
            console.error('Error in markAllAsRead:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting notification:', error);
                toast({
                    title: "Error",
                    description: "Failed to delete notification",
                    variant: "destructive",
                });
                return;
            }

            // Update local state
            setNotifications(prev =>
                prev.filter(notification => notification.id !== id)
            );

            toast({
                title: "Success",
                description: "Notification deleted successfully",
            });
        } catch (error) {
            console.error('Error in deleteNotification:', error);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user?.id);

            if (error) {
                console.error('Error clearing all notifications:', error);
                toast({
                    title: "Error",
                    description: "Failed to clear all notifications",
                    variant: "destructive",
                });
                return;
            }

            // Update local state
            setNotifications([]);

            toast({
                title: "Success",
                description: "All notifications cleared successfully",
            });
        } catch (error) {
            console.error('Error in clearAllNotifications:', error);
        }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get notification icon based on type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'application':
                return <FaBriefcase className="h-5 w-5 text-blue-500" />;
            case 'interview':
                return <FaCalendarAlt className="h-5 w-5 text-green-500" />;
            case 'reminder':
                return <FaInfoCircle className="h-5 w-5 text-amber-500" />;
            case 'alert':
                return <FaExclamationTriangle className="h-5 w-5 text-red-500" />;
            default:
                return <FaBell className="h-5 w-5 text-gray-500" />;
        }
    };

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.read).length;

    // Tab counts
    const applicationCount = notifications.filter(n => n.type === 'application').length;
    const interviewCount = notifications.filter(n => n.type === 'interview').length;
    const reminderCount = notifications.filter(n => n.type === 'reminder').length;
    const alertCount = notifications.filter(n => n.type === 'alert').length;

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-background flex w-full">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <main className="flex-1 pb-10">
                        <div className="container mt-8 px-4 sm:px-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                                    <p className="text-muted-foreground mt-1">Stay updated with your application status and important alerts</p>
                                </div>
                                <div className="flex gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                                                <FaFilter className="h-4 w-4" />
                                                <span>Actions</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Notification Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={markAllAsRead}>
                                                <FaCheckDouble className="h-4 w-4 mr-2" />
                                                <span>Mark all as read</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={clearAllNotifications}>
                                                <FaTrash className="h-4 w-4 mr-2" />
                                                <span>Clear all notifications</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <Card>
                                <CardContent className="p-0">
                                    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <div className="border-b px-4 py-2">
                                            <TabsList className="grid grid-cols-5 md:w-auto w-full">
                                                <TabsTrigger value="all" className="flex items-center gap-2">
                                                    <span>All</span>
                                                    <Badge variant="secondary" className="ml-auto rounded-full">
                                                        {notifications.length}
                                                    </Badge>
                                                </TabsTrigger>
                                                <TabsTrigger value="unread" className="flex items-center gap-2">
                                                    <span>Unread</span>
                                                    <Badge variant="secondary" className="ml-auto rounded-full">
                                                        {unreadCount}
                                                    </Badge>
                                                </TabsTrigger>
                                                <TabsTrigger value="application" className="flex items-center gap-2">
                                                    <span>Applications</span>
                                                    <Badge variant="secondary" className="ml-auto rounded-full">
                                                        {applicationCount}
                                                    </Badge>
                                                </TabsTrigger>
                                                <TabsTrigger value="interview" className="flex items-center gap-2">
                                                    <span>Interviews</span>
                                                    <Badge variant="secondary" className="ml-auto rounded-full">
                                                        {interviewCount}
                                                    </Badge>
                                                </TabsTrigger>
                                                <TabsTrigger value="reminder" className="flex items-center gap-2">
                                                    <span>Reminders</span>
                                                    <Badge variant="secondary" className="ml-auto rounded-full">
                                                        {reminderCount + alertCount}
                                                    </Badge>
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <TabsContent value={activeTab} className="p-0 focus-visible:outline-none focus-visible:ring-0">
                                            <ScrollArea className="h-[calc(100vh-250px)]">
                                                {isLoading ? (
                                                    <div className="flex items-center justify-center h-40">
                                                        <p className="text-muted-foreground">Loading notifications...</p>
                                                    </div>
                                                ) : getFilteredNotifications().length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-40">
                                                        <FaBell className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                                                        <p className="text-muted-foreground">No notifications found</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y">
                                                        {getFilteredNotifications().map((notification) => (
                                                            <div
                                                                key={notification.id}
                                                                className={`p-4 flex items-start gap-4 hover:bg-accent/10 ${notification.read ? '' : 'bg-primary/5'}`}
                                                            >
                                                                <div className="flex-shrink-0 mt-1">
                                                                    {getNotificationIcon(notification.type)}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className={`font-medium ${notification.read ? '' : 'font-semibold'}`}>
                                                                            {notification.title}
                                                                        </h3>
                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                                            {formatDate(notification.created_at)}
                                                                        </span>
                                                                    </div>

                                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                                        {notification.content}
                                                                    </p>

                                                                    <div className="flex gap-4 mt-2">
                                                                        {!notification.read && (
                                                                            <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)} className="h-8 px-2">
                                                                                <FaCheck className="h-3 w-3 mr-2" />
                                                                                <span>Mark as read</span>
                                                                            </Button>
                                                                        )}

                                                                        {notification.reference_id && (
                                                                            <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                                                                                <a href={`/applications#${notification.reference_id}`}>
                                                                                    <FaBriefcase className="h-3 w-3 mr-2" />
                                                                                    <span>View application</span>
                                                                                </a>
                                                                            </Button>
                                                                        )}

                                                                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)} className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                            <FaTrash className="h-3 w-3 mr-2" />
                                                                            <span>Delete</span>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
} 