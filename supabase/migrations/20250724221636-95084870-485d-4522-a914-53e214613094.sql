-- Create table for TokenMetrics API keys
CREATE TABLE public.tokenmetrics_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tokenmetrics_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own TokenMetrics credentials" ON public.tokenmetrics_credentials
FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_tokenmetrics_credentials_updated_at
  BEFORE UPDATE ON public.tokenmetrics_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();