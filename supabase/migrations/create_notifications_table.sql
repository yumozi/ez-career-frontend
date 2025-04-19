-- Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('application', 'interview', 'reminder', 'alert')),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    reference_id UUID,  -- Can reference an application or other entity
    reference_type TEXT  -- Type of entity being referenced
);

-- Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow system to insert notifications for users
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Add table comments
COMMENT ON TABLE public.notifications IS 'Stores user notifications for application status changes and alerts'; 