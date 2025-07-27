import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Trade {
  id: string;
  symbol: string;
  side: string;
  price: number;
  filled_price: number;
  stop_loss: number;
  take_profit: number;
  status: string;
}

const PositionMonitor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [monitoring, setMonitoring] = useState(false);

  const checkPositions = async () => {
    if (!user || monitoring) return;

    try {
      setMonitoring(true);

      // Получаем открытые позиции
      const { data: openTrades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'OPEN')
        .not('stop_loss', 'is', null)
        .not('take_profit', 'is', null);

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      if (!openTrades || openTrades.length === 0) return;

      console.log(`🔍 Мониторинг ${openTrades.length} открытых позиций`);

      for (const trade of openTrades) {
        try {
          // Получаем текущую цену
          const priceResponse = await fetch(`https://bemevsvoentrlojsxsdp.supabase.co/functions/v1/bybit-api`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlbWV2c3ZvZW50cmxvanN4c2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzODc0MDQsImV4cCI6MjA2Nzk2MzQwNH0.hpJvBZ1yjCqI9tTnbbpnNeaA5B8V-cJ4xbjabFh8Gt8`,
            },
            body: JSON.stringify({
              user_id: user.id,
              is_demo: true,
              action: 'get_kline_data',
              data: {
                symbol: trade.symbol,
                interval: '1m',
                limit: 1
              }
            })
          });

          const priceResult = await priceResponse.json();
          
          if (!priceResult.success) continue;

          const currentPrice = parseFloat(priceResult.data.result.list[0][4]); // Close price
          const entryPrice = trade.filled_price || trade.price;
          const stopLoss = trade.stop_loss;
          const takeProfit = trade.take_profit;

          console.log(`📊 ${trade.symbol}: Цена $${currentPrice}, Вход $${entryPrice}, SL $${stopLoss}, TP $${takeProfit}`);

          let shouldClose = false;
          let exitReason = '';
          let pnl = 0;

          if (trade.side === 'BUY') {
            // Для покупки: закрываем если цена упала до стоп-лосса или выросла до тейк-профита
            if (currentPrice <= stopLoss) {
              shouldClose = true;
              exitReason = 'stop_loss';
              pnl = (currentPrice - entryPrice) * trade.quantity;
            } else if (currentPrice >= takeProfit) {
              shouldClose = true;
              exitReason = 'take_profit';
              pnl = (currentPrice - entryPrice) * trade.quantity;
            }
          } else if (trade.side === 'SELL') {
            // Для продажи: закрываем если цена выросла до стоп-лосса или упала до тейк-профита
            if (currentPrice >= stopLoss) {
              shouldClose = true;
              exitReason = 'stop_loss';
              pnl = (entryPrice - currentPrice) * trade.quantity;
            } else if (currentPrice <= takeProfit) {
              shouldClose = true;
              exitReason = 'take_profit';
              pnl = (entryPrice - currentPrice) * trade.quantity;
            }
          }

          if (shouldClose) {
            console.log(`🚨 Закрытие позиции ${trade.symbol} по ${exitReason}: P&L $${pnl.toFixed(2)}`);

            // Обновляем статус в базе данных
            const { error: updateError } = await supabase
              .from('trades')
              .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString(),
                pnl: pnl,
                filled_price: currentPrice
              })
              .eq('id', trade.id);

            if (!updateError) {
              toast({
                title: `Позиция закрыта`,
                description: `${trade.symbol}: ${exitReason === 'take_profit' ? '🎯 Тейк-профит' : '🛑 Стоп-лосс'} - P&L: $${pnl.toFixed(2)}`,
                variant: pnl > 0 ? "default" : "destructive"
              });
            }
          }
        } catch (error) {
          console.error(`Error monitoring position ${trade.symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in position monitor:', error);
    } finally {
      setMonitoring(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Запускаем мониторинг каждые 30 секунд
    const interval = setInterval(checkPositions, 30000);

    // Запускаем сразу
    checkPositions();

    return () => clearInterval(interval);
  }, [user]);

  return null; // Компонент невидимый, работает в фоне
};

export default PositionMonitor;