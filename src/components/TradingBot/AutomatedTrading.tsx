import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AutomatedTradingProps {
  isActive: boolean;
  isDemo: boolean;
}

const AutomatedTrading = ({ isActive, isDemo }: AutomatedTradingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeAutomatedTrading = async () => {
    if (!user || !isActive) return;

    try {
      console.log(`🤖 Выполняем автоматическую торговлю для пользователя ${user.id}`);
      
      const response = await supabase.functions.invoke('trading-bot', {
        body: {
          user_id: user.id,
          action: 'get_signals',
          data: {
            is_demo: isDemo,
            automatic: true
          }
        }
      });

      if (response.error) {
        console.error('Ошибка автоматической торговли:', response.error);
        return;
      }

      const result = response.data;
      if (result && result.executed_trades > 0) {
        toast({
          title: "Автоматическая торговля",
          description: `Выполнено сделок: ${result.executed_trades}`,
        });
      }
    } catch (error) {
      console.error('Ошибка в автоматической торговле:', error);
    }
  };

  useEffect(() => {
    if (isActive && user) {
      // Запускаем сразу
      executeAutomatedTrading();
      
      // Затем каждые 2 минуты
      intervalRef.current = setInterval(executeAutomatedTrading, 2 * 60 * 1000);
      
      console.log(`🚀 Автоматическая торговля запущена (каждые 2 минуты)`);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log(`⏹️ Автоматическая торговля остановлена`);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, user, isDemo]);

  return null; // Компонент невидимый, работает в фоне
};

export default AutomatedTrading;