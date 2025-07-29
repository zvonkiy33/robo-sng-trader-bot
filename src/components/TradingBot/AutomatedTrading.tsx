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
        console.error('❌ Ошибка автоматической торговли:', response.error);
        toast({
          title: "Ошибка автоматической торговли",
          description: `${response.error.message || 'Неизвестная ошибка'}`,
          variant: "destructive"
        });
        return;
      }

      const result = response.data;
      console.log('🤖 Результат автоматической торговли:', result);
      
      if (result && result.success) {
        const executedSignals = result.data?.signals?.filter((s: any) => s.status === 'EXECUTED') || [];
        
        if (executedSignals.length > 0) {
          toast({
            title: "Автоматическая торговля",
            description: `Выполнено сделок: ${executedSignals.length}`,
          });
        } else {
          console.log('ℹ️ Автоматическая торговля: новых сделок не найдено');
        }
      }
    } catch (error) {
      console.error('Ошибка в автоматической торговле:', error);
    }
  };

  useEffect(() => {
    if (isActive && user) {
      // Запускаем сразу
      executeAutomatedTrading();
      
      // Затем каждые 5 минут (увеличено для снижения нагрузки на API)
      intervalRef.current = setInterval(executeAutomatedTrading, 5 * 60 * 1000);
      
      console.log(`🚀 Автоматическая торговля запущена (каждые 5 минут)`);
      toast({
        title: "Автоматическая торговля запущена",
        description: "Бот будет проверять сигналы каждые 5 минут",
      });
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