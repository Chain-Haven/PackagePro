-- Storage RLS for the 'videos' bucket
-- Authenticated users who are org members can upload and read videos scoped to their org

CREATE POLICY "videos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND public.is_org_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "videos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND public.is_org_member((storage.foldername(name))[1]::uuid)
  );
