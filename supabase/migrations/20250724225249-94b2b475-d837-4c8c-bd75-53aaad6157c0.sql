-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs every 5 minutes to check for signals and execute trades
SELECT cron.schedule(
  'trading-bot-automation',
  '*/5 * * * *', -- every 5 minutes
  $$
  DO $$
  DECLARE
    user_record RECORD;
    bot_record RECORD;
  BEGIN
    -- Loop through all active bots
    FOR user_record IN 
      SELECT DISTINCT user_id, is_demo 
      FROM bot_settings 
      WHERE is_active = true
    LOOP
      -- Get bot settings for this user
      SELECT * INTO bot_record 
      FROM bot_settings 
      WHERE user_id = user_record.user_id 
      AND is_demo = user_record.is_demo 
      AND is_active = true
      LIMIT 1;
      
      IF FOUND THEN
        -- Call the trading bot function
        PERFORM net.http_post(
          url := 'https://bemevsvoentrlojsxsdp.supabase.co/functions/v1/trading-bot',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlbWV2c3ZvZW50cmxvanN4c2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzODc0MDQsImV4cCI6MjA2Nzk2MzQwNH0.hpJvBZ1yjCqI9tTnbbpnNeaA5B8V-cJ4xbjabFh8Gt8"}'::jsonb,
          body := json_build_object(
            'action', 'get_signals',
            'user_id', user_record.user_id,
            'data', json_build_object(
              'is_demo', user_record.is_demo,
              'timeframe', COALESCE(bot_record.timeframe, '15m'),
              'trading_pairs', bot_record.trading_pairs,
              'min_signal_strength', bot_record.min_signal_strength,
              'max_positions', bot_record.max_positions,
              'daily_loss_limit_percent', bot_record.daily_loss_limit_percent
            )
          )::jsonb
        );
      END IF;
    END LOOP;
  END $$;
  $$
);

-- Add timeframe column to bot_settings if it doesn't exist
ALTER TABLE bot_settings 
ADD COLUMN IF NOT EXISTS timeframe text DEFAULT '15m';

-- Create index for better performance on cron job queries
CREATE INDEX IF NOT EXISTS idx_bot_settings_active_user 
ON bot_settings (user_id, is_demo, is_active) 
WHERE is_active = true;