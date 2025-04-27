-- Script to identify and keep only the most recent profile for each user_id
-- This will delete all duplicates while keeping the most recently updated record

-- First, create a temporary table to store the IDs of profiles to keep
CREATE TEMP TABLE profiles_to_keep AS
SELECT DISTINCT ON (user_id) id
FROM profiles
ORDER BY user_id, updated_at DESC;

-- Count the number of profiles before cleanup (for logging)
DO $$
DECLARE
  total_count INTEGER;
  keep_count INTEGER;
  delete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM profiles;
  SELECT COUNT(*) INTO keep_count FROM profiles_to_keep;
  delete_count := total_count - keep_count;
  
  RAISE NOTICE 'Total profiles: %, Profiles to keep: %, Profiles to delete: %', 
    total_count, keep_count, delete_count;
END $$;

-- Delete all profiles that are NOT in the profiles_to_keep table
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM profiles_to_keep);

-- Log the deletion results
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM profiles;
  RAISE NOTICE 'Cleanup complete. Remaining profiles: %', remaining_count;
END $$;

-- Clean up the temporary table
DROP TABLE profiles_to_keep; 