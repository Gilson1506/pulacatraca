-- Storage: ensure bucket exists and policies allow public read + authenticated write

-- Create bucket if it does not exist (run once via SQL editor if permitted)
-- Note: On hosted Supabase, bucket creation is via API/Studio. This DDL is for self-hosted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'event_banners'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('event_banners', 'event_banners', true);
  END IF;
END $$;

-- Public read access to files in the bucket
DROP POLICY IF EXISTS "Public read for event_banners" ON storage.objects;
CREATE POLICY "Public read for event_banners" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'event_banners'
  );

-- Authenticated users can upload to the bucket
DROP POLICY IF EXISTS "Authenticated upload to event_banners" ON storage.objects;
CREATE POLICY "Authenticated upload to event_banners" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'event_banners' AND auth.role() = 'authenticated'
  );

-- Authenticated users can update their own files (optional tighten by owner)
DROP POLICY IF EXISTS "Authenticated update event_banners" ON storage.objects;
CREATE POLICY "Authenticated update event_banners" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'event_banners' AND auth.role() = 'authenticated'
  );

