-- Create the job_preferences table
CREATE TABLE IF NOT EXISTS public.job_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_titles text[],
  experience_level text,
  salary_range text,
  job_search_status text,
  preferred_locations text[],
  remote_preference boolean DEFAULT false,
  preferred_industries text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.job_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.job_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON public.job_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON public.job_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_job_preferences_user_id ON public.job_preferences(user_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_job_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_preferences_updated_at
BEFORE UPDATE ON public.job_preferences
FOR EACH ROW
EXECUTE FUNCTION update_job_preferences_updated_at();

-- Add table comments
COMMENT ON TABLE public.job_preferences IS 'Stores user job preferences for job recommendations and searches'; 