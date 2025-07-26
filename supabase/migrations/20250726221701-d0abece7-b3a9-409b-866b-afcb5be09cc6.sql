-- Включаем real-time обновления для таблицы trades
ALTER TABLE public.trades REPLICA IDENTITY FULL;

-- Добавляем таблицу в публикацию для real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;