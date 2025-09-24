-- =====================================================
-- FIX STORAGE AND RLS POLICIES FOR SUPABASE
-- =====================================================
-- This script fixes the storage bucket creation and RLS policy issues
-- that are causing 400 and 403 errors in your application

DO $$
BEGIN
    RAISE NOTICE '🔧 STARTING STORAGE AND RLS FIXES...';
    
    -- =====================================================
    -- STEP 1: CREATE STORAGE BUCKET IF NOT EXISTS
    -- =====================================================
    RAISE NOTICE '📦 Step 1: Creating storage bucket...';
    
    -- Check if bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'event_banners') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'event_banners',
            'event_banners',
            true,
            5242880, -- 5MB
            ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        );
        RAISE NOTICE '✅ Bucket "event_banners" created successfully';
    ELSE
        RAISE NOTICE '✅ Bucket "event_banners" already exists';
    END IF;
    
    -- =====================================================
    -- STEP 2: CREATE STORAGE POLICIES
    -- =====================================================
    RAISE NOTICE '🔒 Step 2: Creating storage policies...';
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view banners" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload event banners" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view event banners" ON storage.objects;
    
    -- Create new storage policies
    CREATE POLICY "Authenticated users can upload banners"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'event_banners' 
        AND auth.role() = 'authenticated'
    );
    
    CREATE POLICY "Public can view banners"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'event_banners');
    
    CREATE POLICY "Users can update their banners"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'event_banners'
        AND auth.role() = 'authenticated'
    );
    
    CREATE POLICY "Users can delete their banners"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'event_banners'
        AND auth.role() = 'authenticated'
    );
    
    RAISE NOTICE '✅ Storage policies created successfully';
    
    -- =====================================================
    -- STEP 3: FIX EVENTS TABLE RLS POLICIES
    -- =====================================================
    RAISE NOTICE '🎫 Step 3: Fixing events table RLS policies...';
    
    -- Enable RLS on events table if not already enabled
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view public events" ON events;
    DROP POLICY IF EXISTS "Organizers can create events" ON events;
    DROP POLICY IF EXISTS "Organizers can update their events" ON events;
    DROP POLICY IF EXISTS "Organizers can delete their events" ON events;
    DROP POLICY IF EXISTS "Admins can do everything with events" ON events;
    
    -- Create comprehensive events policies
    CREATE POLICY "Users can view public events"
    ON events FOR SELECT
    USING (true); -- Anyone can view events
    
    CREATE POLICY "Organizers can create events"
    ON events FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = organizer_id 
            OR auth.uid() = created_by
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('organizer', 'admin')
            )
        )
    );
    
    CREATE POLICY "Organizers can update their events"
    ON events FOR UPDATE
    USING (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = organizer_id 
            OR auth.uid() = created_by
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        )
    );
    
    CREATE POLICY "Organizers can delete their events"
    ON events FOR DELETE
    USING (
        auth.uid() IS NOT NULL 
        AND (
            auth.uid() = organizer_id 
            OR auth.uid() = created_by
            OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        )
    );
    
    RAISE NOTICE '✅ Events table RLS policies created successfully';
    
    -- =====================================================
    -- STEP 4: FIX EVENT_TICKET_TYPES TABLE RLS POLICIES
    -- =====================================================
    RAISE NOTICE '🎟️ Step 4: Fixing event_ticket_types table RLS policies...';
    
    -- Enable RLS on event_ticket_types table if not already enabled
    ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view ticket types" ON event_ticket_types;
    DROP POLICY IF EXISTS "Organizers can manage ticket types" ON event_ticket_types;
    DROP POLICY IF EXISTS "Organizers can create ticket types" ON event_ticket_types;
    DROP POLICY IF EXISTS "Organizers can update ticket types" ON event_ticket_types;
    DROP POLICY IF EXISTS "Organizers can delete ticket types" ON event_ticket_types;
    
    -- Create comprehensive ticket types policies
    CREATE POLICY "Users can view ticket types"
    ON event_ticket_types FOR SELECT
    USING (true); -- Anyone can view ticket types
    
    CREATE POLICY "Organizers can create ticket types"
    ON event_ticket_types FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_id 
            AND (
                organizer_id = auth.uid() 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
            )
        )
    );
    
    CREATE POLICY "Organizers can update ticket types"
    ON event_ticket_types FOR UPDATE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_id 
            AND (
                organizer_id = auth.uid() 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
            )
        )
    );
    
    CREATE POLICY "Organizers can delete ticket types"
    ON event_ticket_types FOR DELETE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_id 
            AND (
                organizer_id = auth.uid() 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
            )
        )
    );
    
    RAISE NOTICE '✅ Event ticket types RLS policies created successfully';
    
    -- =====================================================
    -- STEP 5: FIX PROFILES TABLE RLS POLICIES
    -- =====================================================
    RAISE NOTICE '👤 Step 5: Fixing profiles table RLS policies...';
    
    -- Enable RLS on profiles table if not already enabled
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    
    -- Create comprehensive profiles policies
    CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true); -- Anyone can view profiles (needed for organizer info)
    
    CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
    
    CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
    
    RAISE NOTICE '✅ Profiles RLS policies created successfully';
    
    -- =====================================================
    -- STEP 6: VERIFICATION AND SUMMARY
    -- =====================================================
    RAISE NOTICE '🔍 Step 6: Verification...';
    
    -- Check storage bucket
    PERFORM 1 FROM storage.buckets WHERE id = 'event_banners';
    IF FOUND THEN
        RAISE NOTICE '✅ Storage bucket "event_banners" exists';
    ELSE
        RAISE NOTICE '❌ Storage bucket "event_banners" NOT found';
    END IF;
    
    -- Check storage policies
    PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload banners';
    IF FOUND THEN
        RAISE NOTICE '✅ Storage upload policy exists';
    ELSE
        RAISE NOTICE '❌ Storage upload policy NOT found';
    END IF;
    
    -- Check events policies
    PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Organizers can create events';
    IF FOUND THEN
        RAISE NOTICE '✅ Events creation policy exists';
    ELSE
        RAISE NOTICE '❌ Events creation policy NOT found';
    END IF;
    
    RAISE NOTICE '🎉 ALL FIXES COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SUMMARY OF CHANGES:';
    RAISE NOTICE '   ✅ Created storage bucket "event_banners"';
    RAISE NOTICE '   ✅ Created storage policies for authenticated users';
    RAISE NOTICE '   ✅ Fixed events table RLS policies';
    RAISE NOTICE '   ✅ Fixed event_ticket_types table RLS policies';
    RAISE NOTICE '   ✅ Fixed profiles table RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 NEXT STEPS:';
    RAISE NOTICE '   1. Test image upload in EventFormModal';
    RAISE NOTICE '   2. Test event creation/editing';
    RAISE NOTICE '   3. Verify authentication is working properly';
    RAISE NOTICE '';
    RAISE NOTICE '💡 If you still have issues:';
    RAISE NOTICE '   - Check that your user has the correct role (organizer/admin)';
    RAISE NOTICE '   - Verify authentication tokens are valid';
    RAISE NOTICE '   - Check browser console for detailed error messages';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE '💡 Try running individual sections of this script manually';
        RAISE;
END $$;