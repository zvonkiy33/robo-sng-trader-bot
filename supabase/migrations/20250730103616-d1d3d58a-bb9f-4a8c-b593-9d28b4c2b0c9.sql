-- Create table for caching TokenMetrics signals
CREATE TABLE IF NOT EXISTS public.tokenmetrics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbols TEXT[] NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '15m',
  signals JSONB NOT NULL,
  api_calls_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tokenmetrics_cache_user_timeframe 
ON public.tokenmetrics_cache (user_id, timeframe, created_at DESC);

-- Enable RLS
ALTER TABLE public.tokenmetrics_cache ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own cache" 
ON public.tokenmetrics_cache 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cache" 
ON public.tokenmetrics_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache" 
ON public.tokenmetrics_cache 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create table for API usage tracking
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  error_message TEXT,
  request_count INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for monitoring
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_api_date 
ON public.api_usage_logs (user_id, api_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage logs" 
ON public.api_usage_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usage logs" 
ON public.api_usage_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to clean old cache entries (older than 1 hour)
CREATE OR REPLACE FUNCTION clean_old_tokenmetrics_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.tokenmetrics_cache 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean old API logs (older than 30 days)
CREATE OR REPLACE FUNCTION clean_old_api_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_usage_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;