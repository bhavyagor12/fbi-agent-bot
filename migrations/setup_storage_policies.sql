-- Storage policies for fbi_projects_files bucket
-- Run this in your Supabase SQL Editor to set up proper access to the storage bucket

-- Allow anyone to upload files to the bucket
CREATE POLICY "Allow uploads to fbi_projects_files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fbi_projects_files');

-- Allow anyone to view/download files from the bucket
CREATE POLICY "Allow public access to fbi_projects_files"
ON storage.objects FOR SELECT
USING (bucket_id = 'fbi_projects_files');

-- Allow deletion from the bucket (for cleanup if needed)
CREATE POLICY "Allow delete from fbi_projects_files"
ON storage.objects FOR DELETE
USING (bucket_id = 'fbi_projects_files');

-- Optional: Update policy (if you need to replace files)
CREATE POLICY "Allow update to fbi_projects_files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fbi_projects_files');

