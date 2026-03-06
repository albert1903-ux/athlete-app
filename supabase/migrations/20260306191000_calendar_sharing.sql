-- Create calendar_shares table
CREATE TABLE IF NOT EXISTS public.calendar_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(owner_id, shared_with_id)
);

-- Enable RLS on calendar_shares
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_shares
CREATE POLICY "Users can view calendar shares they are involved in"
    ON public.calendar_shares FOR SELECT
    USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can insert shares where they are owner"
    ON public.calendar_shares FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update shares where they are the recipient"
    ON public.calendar_shares FOR UPDATE
    USING (auth.uid() = shared_with_id);

CREATE POLICY "Users can delete shares they are involved in"
    ON public.calendar_shares FOR DELETE
    USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Function to securely share calendar by email
CREATE OR REPLACE FUNCTION public.share_calendar_by_email(target_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    new_share_id UUID;
    caller_id UUID;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Look up the target user by email
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with this email not found';
    END IF;

    IF target_user_id = caller_id THEN
        RAISE EXCEPTION 'Cannot share calendar with yourself';
    END IF;

    -- Insert into calendar_shares
    INSERT INTO public.calendar_shares (owner_id, shared_with_id, status)
    VALUES (caller_id, target_user_id, 'pending')
    ON CONFLICT (owner_id, shared_with_id) DO UPDATE SET status = 'pending'
    RETURNING id INTO new_share_id;

    -- Insert notification for the target user
    INSERT INTO public.notifications (user_id, sender_id, type, reference_id)
    VALUES (target_user_id, caller_id, 'calendar_share_request', new_share_id);

    RETURN new_share_id;
END;
$$;

-- Function to handle accepting a share
CREATE OR REPLACE FUNCTION public.accept_calendar_share(share_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_record RECORD;
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the share record
    SELECT * INTO share_record FROM public.calendar_shares WHERE id = share_id AND shared_with_id = caller_id;

    IF share_record IS NULL THEN
        RAISE EXCEPTION 'Share request not found or unauthorized';
    END IF;

    -- Update status
    UPDATE public.calendar_shares SET status = 'accepted' WHERE id = share_id;

    -- Send notification to owner
    INSERT INTO public.notifications (user_id, sender_id, type, reference_id)
    VALUES (share_record.owner_id, caller_id, 'calendar_share_accepted', share_id);

    RETURN TRUE;
END;
$$;

-- Function to handle rejecting a share
CREATE OR REPLACE FUNCTION public.reject_calendar_share(share_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_record RECORD;
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the share record
    SELECT * INTO share_record FROM public.calendar_shares WHERE id = share_id AND shared_with_id = caller_id;

    IF share_record IS NULL THEN
        RAISE EXCEPTION 'Share request not found or unauthorized';
    END IF;

    -- Update status
    UPDATE public.calendar_shares SET status = 'rejected' WHERE id = share_id;

    -- Optionally send notification to owner (maybe not needed for rejection, to avoid noise)
    
    RETURN TRUE;
END;
$$;
