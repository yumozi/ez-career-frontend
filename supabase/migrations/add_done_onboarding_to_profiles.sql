-- Add done_onboarding column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS done_onboarding BOOLEAN DEFAULT FALSE;

-- Update current records to set done_onboarding to true if they have preferences
UPDATE public.profiles p
SET done_onboarding = TRUE
WHERE EXISTS (
    SELECT 1 FROM public.job_preferences jp 
    WHERE jp.user_id = p.user_id
);

COMMENT ON COLUMN public.profiles.done_onboarding IS 'Indicates whether the user has completed or skipped the onboarding process'; 