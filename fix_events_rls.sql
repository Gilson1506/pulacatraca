-- Fix RLS for events so organizers can insert/update/select their own events

-- Ensure RLS is enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public can view approved events
DROP POLICY IF EXISTS "Public can view approved events" ON public.events;
CREATE POLICY "Public can view approved events" ON public.events
  FOR SELECT
  USING (status = 'approved');

-- Organizers can view their own events (supports either organizer_id or created_by)
DROP POLICY IF EXISTS "Organizers can select own events" ON public.events;
CREATE POLICY "Organizers can select own events" ON public.events
  FOR SELECT
  USING (COALESCE(organizer_id, created_by) = auth.uid());

-- Organizers can create their own events
DROP POLICY IF EXISTS "Organizers can insert events" ON public.events;
CREATE POLICY "Organizers can insert events" ON public.events
  FOR INSERT
  WITH CHECK (COALESCE(organizer_id, created_by) = auth.uid());

-- Organizers can update their own events
DROP POLICY IF EXISTS "Organizers can update events" ON public.events;
CREATE POLICY "Organizers can update events" ON public.events
  FOR UPDATE
  USING (COALESCE(organizer_id, created_by) = auth.uid());

-- Organizers can delete their own events (optional)
DROP POLICY IF EXISTS "Organizers can delete events" ON public.events;
CREATE POLICY "Organizers can delete events" ON public.events
  FOR DELETE
  USING (COALESCE(organizer_id, created_by) = auth.uid());

-- Ticket types: allow organizers to manage ticket types of their events
DROP POLICY IF EXISTS "Organizers can manage their ticket types" ON public.event_ticket_types;
CREATE POLICY "Organizers can manage their ticket types" ON public.event_ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_types.event_id
        AND COALESCE(e.organizer_id, e.created_by) = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_types.event_id
        AND COALESCE(e.organizer_id, e.created_by) = auth.uid()
    )
  );

