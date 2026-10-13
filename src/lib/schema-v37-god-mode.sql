-- V37 MIGRATION: God Mode Infrastructure & Inbound Quarantine

-- 1. Add Freeze and Delay settings to Companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inbound_delay_minutes INTEGER DEFAULT 0;

-- 2. Add Quarantine Timestamp to Wire Requests
ALTER TABLE public.wire_requests
ADD COLUMN IF NOT EXISTS visible_after TIMESTAMPTZ DEFAULT NOW();

-- 3. Create Trigger to auto-calculate visible_after on new wires
CREATE OR REPLACE FUNCTION public.set_wire_quarantine_delay()
RETURNS TRIGGER AS $$
DECLARE
    delay_mins INTEGER;
BEGIN
    SELECT inbound_delay_minutes INTO delay_mins FROM public.companies WHERE id = NEW.company_id;
    IF delay_mins > 0 THEN
        NEW.visible_after := NOW() + (delay_mins || ' minutes')::interval;
    ELSE
        NEW.visible_after := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the trigger
DROP TRIGGER IF EXISTS trigger_set_wire_quarantine ON public.wire_requests;
CREATE TRIGGER trigger_set_wire_quarantine
BEFORE INSERT ON public.wire_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_wire_quarantine_delay();
