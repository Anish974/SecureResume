-- Update storage bucket to remove mime type restrictions that might be causing issues
UPDATE storage.buckets 
SET allowed_mime_types = NULL,
    file_size_limit = 10485760
WHERE id = 'resumes';

-- Ensure CORS is properly configured for storage
-- Note: This sets up proper access for the storage bucket
UPDATE storage.buckets
SET public = false
WHERE id = 'resumes';