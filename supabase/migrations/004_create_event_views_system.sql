-- Migration: Create Event Views System
-- Description: Adds view tracking functionality for events with IP+UserAgent deduplication
-- Author: System
-- Date: 2025-11-26

-- ============================================
-- 1. CREATE event_views TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.event_views IS 'Tracks individual event page views for analytics';
COMMENT ON COLUMN public.event_views.session_id IS 'Browser session ID generated on frontend';
COMMENT ON COLUMN public.event_views.ip_address IS 'IP address of viewer for deduplication';
COMMENT ON COLUMN public.event_views.user_agent IS 'Browser user agent for deduplication';

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for querying views by event
CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON public.event_views(event_id);

-- Index for querying views by user (for authenticated users)
CREATE INDEX IF NOT EXISTS idx_event_views_user_id ON public.event_views(user_id) WHERE user_id IS NOT NULL;

-- Index for querying views by session
CREATE INDEX IF NOT EXISTS idx_event_views_session_id ON public.event_views(session_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_event_views_viewed_at ON public.event_views(viewed_at DESC);

-- Composite index for event analytics queries
CREATE INDEX IF NOT EXISTS idx_event_views_event_viewed ON public.event_views(event_id, viewed_at DESC);

-- Composite index for deduplication (IP + User Agent)
CREATE INDEX IF NOT EXISTS idx_event_views_dedup_ip_ua ON public.event_views(event_id, ip_address, user_agent);

-- ============================================
-- 3. ADD VIEW COUNTERS TO events TABLE
-- ============================================

-- Add view count columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'events' 
                 AND column_name = 'view_count') THEN
    ALTER TABLE public.events ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'events' 
                 AND column_name = 'unique_view_count') THEN
    ALTER TABLE public.events ADD COLUMN unique_view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'events' 
                 AND column_name = 'last_viewed_at') THEN
    ALTER TABLE public.events ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add index for sorting events by popularity
CREATE INDEX IF NOT EXISTS idx_events_view_count ON public.events(view_count DESC);

-- Add comments
COMMENT ON COLUMN public.events.view_count IS 'Total number of page views';
COMMENT ON COLUMN public.events.unique_view_count IS 'Number of unique viewers (by IP+UserAgent)';
COMMENT ON COLUMN public.events.last_viewed_at IS 'Timestamp of most recent view';

-- ============================================
-- 4. CREATE FUNCTION TO REGISTER VIEW
-- ============================================

CREATE OR REPLACE FUNCTION public.register_event_view(
  p_event_id UUID,
  p_user_id UUID,
  p_session_id TEXT,
  p_ip_address INET,
  p_user_agent TEXT
) RETURNS JSONB AS $$
DECLARE
  v_is_new_view BOOLEAN := FALSE;
  v_is_unique_view BOOLEAN := FALSE;
  v_existing_view RECORD;
BEGIN
  -- Verificar se já existe view com mesmo IP + User Agent (PERMANENTE - Opção C)
  SELECT * INTO v_existing_view
  FROM public.event_views
  WHERE event_id = p_event_id
    AND ip_address = p_ip_address
    AND user_agent = p_user_agent
  LIMIT 1;

  -- Se não existe, registrar nova view
  IF v_existing_view IS NULL THEN
    INSERT INTO public.event_views (
      event_id, user_id, session_id, ip_address, user_agent
    ) VALUES (
      p_event_id, p_user_id, p_session_id, p_ip_address, p_user_agent
    );
    
    v_is_new_view := TRUE;
    v_is_unique_view := TRUE; -- Como é permanente, toda nova view é única
    
    -- Atualizar contadores no evento
    UPDATE public.events
    SET 
      view_count = view_count + 1,
      unique_view_count = unique_view_count + 1,
      last_viewed_at = NOW()
    WHERE id = p_event_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'is_new_view', v_is_new_view,
    'is_unique_view', v_is_unique_view,
    'message', CASE 
      WHEN v_is_new_view THEN 'View registrada com sucesso'
      ELSE 'View já registrada anteriormente'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.register_event_view IS 'Registers an event view with IP+UserAgent deduplication (permanent)';

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on event_views table
ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert event views (public tracking)
CREATE POLICY "Anyone can insert event views"
  ON public.event_views FOR INSERT
  WITH CHECK (true);

-- Policy: Public can read view counts (aggregated data only)
CREATE POLICY "Public can view event view counts"
  ON public.event_views FOR SELECT
  USING (true);

-- Policy: Organizers can view detailed analytics of their events
CREATE POLICY "Organizers can view their event views details"
  ON public.event_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_views.event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- ============================================
-- 6. HELPER FUNCTION FOR ANALYTICS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_event_view_stats(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_views', COALESCE(e.view_count, 0),
    'unique_views', COALESCE(e.unique_view_count, 0),
    'last_viewed_at', e.last_viewed_at,
    'views_today', (
      SELECT COUNT(*) FROM public.event_views
      WHERE event_id = p_event_id
        AND viewed_at >= CURRENT_DATE
    ),
    'views_this_week', (
      SELECT COUNT(*) FROM public.event_views
      WHERE event_id = p_event_id
        AND viewed_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'views_this_month', (
      SELECT COUNT(*) FROM public.event_views
      WHERE event_id = p_event_id
        AND viewed_at >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO v_stats
  FROM public.events e
  WHERE e.id = p_event_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_event_view_stats IS 'Returns comprehensive view statistics for an event';

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.register_event_view TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_view_stats TO anon, authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
