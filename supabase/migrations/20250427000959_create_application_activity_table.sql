-- Create the application_activity table
CREATE TABLE IF NOT EXISTS public.application_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('created', 'status_updated', 'note_added', 'detail_updated')),
    previous_status TEXT,
    new_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    details TEXT
);

-- Add RLS policies
ALTER TABLE public.application_activity ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own activity logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.application_activity;
CREATE POLICY "Users can view their own activity logs" 
ON public.application_activity
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert activities related to their applications
DROP POLICY IF EXISTS "Users can insert activities for their applications" ON public.application_activity;
CREATE POLICY "Users can insert activities for their applications" 
ON public.application_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_activity_user_id ON public.application_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_app_activity_application_id ON public.application_activity(application_id);
CREATE INDEX IF NOT EXISTS idx_app_activity_created_at ON public.application_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_app_activity_action_type ON public.application_activity(action_type);

-- Add table comments
COMMENT ON TABLE public.application_activity IS 'Stores history of actions performed on applications';

-- Create a function to generate activity records when application status changes
CREATE OR REPLACE FUNCTION public.create_application_status_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create an activity log if the status has changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.application_activity (
            user_id,
            application_id,
            action_type,
            previous_status,
            new_status,
            details
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'status_updated',
            OLD.status,
            NEW.status,
            'Application status changed'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for application status changes
DROP TRIGGER IF EXISTS application_status_change_trigger ON public.applications;

CREATE TRIGGER application_status_change_trigger
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.create_application_status_activity(); 