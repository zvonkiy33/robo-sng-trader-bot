-- Add signal_source column to bot_settings table to support hybrid trading
ALTER TABLE public.bot_settings 
ADD COLUMN IF NOT EXISTS signal_source text DEFAULT 'AUTO';

-- Add comment to explain the column
COMMENT ON COLUMN public.bot_settings.signal_source IS 'Signal source: AUTO (prefer TokenMetrics, fallback to AI), TOKENMETRICS (only TokenMetrics), AI_ANALYZER (only AI)';

-- Add constraint to ensure valid values
ALTER TABLE public.bot_settings 
ADD CONSTRAINT signal_source_check 
CHECK (signal_source IN ('AUTO', 'TOKENMETRICS', 'AI_ANALYZER'));