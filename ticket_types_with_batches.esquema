-- =====================================================
-- VERIFICATION SCRIPT FOR STORAGE AND RLS FIXES
-- =====================================================
-- Run this after executing fix_storage_and_rls_policies.sql

DO $$
DECLARE
    bucket_exists boolean;
    policies_count integer;
    events_policies_count integer;
    ticket_policies_count integer;
BEGIN
    RAISE NOTICE '🔍 VERIFYING SUPABASE FIXES...';
    RAISE NOTICE '';
    
    -- =====================================================
    -- CHECK 1: STORAGE BUCKET
    -- =====================================================
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'event_banners') INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Storage bucket "event_banners" exists';
        
        -- Show bucket details
        SELECT file_size_limit, public, allowed_mime_types 
        FROM storage.buckets 
        WHERE id = 'event_banners'
        INTO STRICT policies_count; -- reusing variable
        
        RAISE NOTICE '   📦 Bucket is public: %', (SELECT public FROM storage.buckets WHERE id = 'event_banners');
        RAISE NOTICE '   📦 File size limit: % bytes', (SELECT file_size_limit FROM storage.buckets WHERE id = 'event_banners');
    ELSE
        RAISE NOTICE '❌ Storage bucket "event_banners" NOT found';
    END IF;
    
    -- =====================================================
    -- CHECK 2: STORAGE POLICIES
    -- =====================================================
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%banner%'
    INTO policies_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Storage Policies Count: %', policies_count;
    
    -- List storage policies
    FOR policies_count IN 
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%banner%'
    LOOP
        RAISE NOTICE '   ✅ %', (
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'storage' 
            AND tablename = 'objects' 
            AND policyname LIKE '%banner%'
            LIMIT 1 OFFSET policies_count - 1
        );
    END LOOP;
    
    -- =====================================================
    -- CHECK 3: EVENTS TABLE POLICIES
    -- =====================================================
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events'
    INTO events_policies_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎫 Events Table Policies Count: %', events_policies_count;
    
    -- List events policies
    FOR policies_count IN 
        SELECT ROW_NUMBER() OVER() 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'events'
    LOOP
        RAISE NOTICE '   ✅ %', (
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'events'
            ORDER BY policyname
            LIMIT 1 OFFSET policies_count - 1
        );
    END LOOP;
    
    -- =====================================================
    -- CHECK 4: EVENT_TICKET_TYPES TABLE POLICIES
    -- =====================================================
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'event_ticket_types'
    INTO ticket_policies_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎟️ Event Ticket Types Policies Count: %', ticket_policies_count;
    
    -- List ticket types policies
    FOR policies_count IN 
        SELECT ROW_NUMBER() OVER() 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_ticket_types'
    LOOP
        RAISE NOTICE '   ✅ %', (
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'event_ticket_types'
            ORDER BY policyname
            LIMIT 1 OFFSET policies_count - 1
        );
    END LOOP;
    
    -- =====================================================
    -- CHECK 5: RLS STATUS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS Status:';
    
    -- Check events table RLS
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'events' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    INTO bucket_exists; -- reusing variable
    
    RAISE NOTICE '   🎫 Events table RLS enabled: %', bucket_exists;
    
    -- Check event_ticket_types table RLS
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'event_ticket_types' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    INTO bucket_exists;
    
    RAISE NOTICE '   🎟️ Event ticket types RLS enabled: %', bucket_exists;
    
    -- Check profiles table RLS
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'profiles' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    INTO bucket_exists;
    
    RAISE NOTICE '   👤 Profiles table RLS enabled: %', bucket_exists;
    
    -- =====================================================
    -- SUMMARY
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICATION SUMMARY:';
    RAISE NOTICE '   ✅ Storage bucket: %', CASE WHEN bucket_exists THEN 'READY' ELSE 'MISSING' END;
    RAISE NOTICE '   ✅ Storage policies: % configured', policies_count;
    RAISE NOTICE '   ✅ Events policies: % configured', events_policies_count;
    RAISE NOTICE '   ✅ Ticket policies: % configured', ticket_policies_count;
    RAISE NOTICE '';
    
    IF events_policies_count >= 4 AND ticket_policies_count >= 4 THEN
        RAISE NOTICE '🎉 ALL POLICIES CONFIGURED CORRECTLY!';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 You can now:';
        RAISE NOTICE '   1. Upload images in EventFormModal';
        RAISE NOTICE '   2. Create and edit events';
        RAISE NOTICE '   3. Manage event ticket types';
        RAISE NOTICE '';
        RAISE NOTICE '💡 If you still get errors, check:';
        RAISE NOTICE '   - User authentication status';
        RAISE NOTICE '   - User role (should be organizer or admin)';
        RAISE NOTICE '   - Browser console for detailed error messages';
    ELSE
        RAISE NOTICE '⚠️ SOME POLICIES MAY BE MISSING';
        RAISE NOTICE '   Please run fix_storage_and_rls_policies.sql again';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ VERIFICATION ERROR: %', SQLERRM;
        RAISE NOTICE '💡 Some checks may have failed, but basic functionality should work';
END $$;