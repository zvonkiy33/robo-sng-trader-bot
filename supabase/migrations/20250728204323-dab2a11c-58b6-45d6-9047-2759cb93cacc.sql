-- Create trading_signals table for storing TokenMetrics signal history
CREATE TABLE public.trading_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_id INTEGER,
    token_symbol TEXT,
    token_name TEXT,
    trading_signal INTEGER, -- 0 = HOLD, 1 = BUY, -1 = SELL
    token_trend INTEGER, -- 0 = NEUTRAL, 1 = BULLISH, -1 = BEARISH
    trader_grade NUMERIC,
    investor_grade NUMERIC,
    confidence NUMERIC,
    holding_returns NUMERIC,
    trading_signals_returns NUMERIC,
    signal_date DATE,
    tm_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own signals" 
ON public.trading_signals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own signals" 
ON public.trading_signals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trading_signals_updated_at
BEFORE UPDATE ON public.trading_signals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();