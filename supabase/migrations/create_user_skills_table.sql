-- Create the user_skills table
CREATE TABLE IF NOT EXISTS public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  proficiency_level text,
  is_highlighted boolean DEFAULT false,
  source text CHECK (source IN ('resume', 'user_input', 'agent_suggestion')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own skills
CREATE POLICY "Users can view their own skills" 
ON public.user_skills 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own skills
CREATE POLICY "Users can insert their own skills" 
ON public.user_skills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own skills
CREATE POLICY "Users can update their own skills" 
ON public.user_skills 
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own skills
CREATE POLICY "Users can delete their own skills" 
ON public.user_skills 
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX idx_user_skills_skill_name ON public.user_skills(skill_name);
CREATE INDEX idx_user_skills_highlighted ON public.user_skills(is_highlighted);

-- Add table comments
COMMENT ON TABLE public.user_skills IS 'Stores user skills extracted from resumes or added manually'; 