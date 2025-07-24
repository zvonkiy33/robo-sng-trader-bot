-- Drop old family tables
DROP TABLE IF EXISTS public.family_events CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE; 
DROP TABLE IF EXISTS public.family_tasks CASCADE;

-- Create trading bot tables
CREATE TABLE public.api_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'bybit',
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trading_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_order_size DECIMAL(20,8),
  tick_size DECIMAL(20,8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'buy' or 'sell'
  order_type TEXT NOT NULL DEFAULT 'market',
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8),
  filled_price DECIMAL(20,8),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'filled', 'cancelled', 'failed'
  exchange_order_id TEXT,
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  signal_source TEXT DEFAULT 'tokenmetrics',
  signal_strength DECIMAL(3,2),
  pnl DECIMAL(20,8),
  fees DECIMAL(20,8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  filled_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  max_positions INTEGER NOT NULL DEFAULT 3,
  position_size_percent DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  stop_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  take_profit_percent DECIMAL(5,2) NOT NULL DEFAULT 4.00,
  daily_loss_limit_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  min_signal_strength DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  trading_pairs TEXT[] NOT NULL DEFAULT ARRAY['BTCUSDT', 'ETHUSDT'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_balance DECIMAL(20,8) NOT NULL,
  available_balance DECIMAL(20,8) NOT NULL,
  unrealized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  daily_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
  open_positions INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,2),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user-specific data
CREATE POLICY "Users can manage their own API credentials" ON public.api_credentials
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trades" ON public.trades
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bot settings" ON public.bot_settings
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own portfolio snapshots" ON public.portfolio_snapshots
FOR ALL USING (auth.uid() = user_id);

-- Trading pairs are public (read-only for all)
CREATE POLICY "Anyone can view trading pairs" ON public.trading_pairs
FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert trading pairs" ON public.trading_pairs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default trading pairs
INSERT INTO public.trading_pairs (symbol, base_asset, quote_asset, min_order_size, tick_size) VALUES
('BTCUSDT', 'BTC', 'USDT', 0.001, 0.01),
('ETHUSDT', 'ETH', 'USDT', 0.01, 0.01);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_settings_updated_at
  BEFORE UPDATE ON public.bot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();