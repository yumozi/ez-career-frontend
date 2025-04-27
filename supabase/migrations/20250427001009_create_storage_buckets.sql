-- Create a storage bucket for user uploads (including resumes)
INSERT INTO storage.buckets (id, name)
VALUES ('user-uploads', 'user-uploads')
ON CONFLICT (id) DO NOTHING;

-- Make the bucket public
UPDATE storage.buckets
SET public = TRUE
WHERE id = 'user-uploads';

-- Set up security policies for the user-uploads bucket
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
CREATE POLICY "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = 'resumes');

DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[2]);

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[2]);

DROP POLICY IF EXISTS "Anyone can download public files" ON storage.objects;
CREATE POLICY "Anyone can download public files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'user-uploads'); 