-- Create the application_issues table
CREATE TABLE IF NOT EXISTS public.application_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    issue_details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT
);

-- Add RLS policies
ALTER TABLE public.application_issues ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own issues
CREATE POLICY "Users can view their own issues" 
ON public.application_issues 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own issues
CREATE POLICY "Users can insert their own issues" 
ON public.application_issues 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own issues
CREATE POLICY "Users can update their own issues" 
ON public.application_issues 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_application_issues_user_id ON public.application_issues(user_id);
CREATE INDEX idx_application_issues_status ON public.application_issues(status);
CREATE INDEX idx_application_issues_application_id ON public.application_issues(application_id);

-- Add table comments
COMMENT ON TABLE public.application_issues IS 'Stores issues that require user intervention during automated job applications'; 