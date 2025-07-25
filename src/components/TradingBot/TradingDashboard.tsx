import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Activity, Settings, TrendingUp, Wallet } from "lucide-react";
import { ApiKeysSetup } from "./ApiKeysSetup";
import { BotSettings } from "./BotSettings";
import { Portfolio } from "./Portfolio";
import { TradingHistory } from "./TradingHistory";
import { PriceChart } from "./PriceChart";
import { BotLogs } from "./BotLogs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function TradingDashboard() {
  const { user } = useAuth(); // Initialize anonymous authentication
  const [isDemo, setIsDemo] = useState(true);
  const [isBotActive, setIsBotActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load bot status on mount
  useEffect(() => {
    if (user) {
      loadBotStatus();
    }
  }, [user]);

  const loadBotStatus = async () => {
    try {
      const { data } = await supabase
        .from('bot_settings')
        .select('is_active, is_demo')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setIsBotActive(data.is_active);
        setIsDemo(data.is_demo);
      }
    } catch (error) {
      console.error('Error loading bot status:', error);
    }
  };

  const handleToggleBot = async () => {
    if (!user) {
      console.error('No user found for toggle bot');
      return;
    }

    console.log('Toggling bot - current state:', isBotActive);
    console.log('User ID:', user.id);
    console.log('Demo mode:', isDemo);

    setLoading(true);
    try {
      const action = isBotActive ? 'stop_bot' : 'start_bot';
      console.log('Action to perform:', action);
      
      const requestBody = {
        user_id: user.id,
        action,
        data: {
          is_demo: isDemo,
          settings: {} // Settings will be loaded from DB
        }
      };
      
      console.log('Request body:', requestBody);
      
      const response = await supabase.functions.invoke('trading-bot', {
        body: requestBody
      });

      console.log('Response from trading-bot:', response);

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw response.error;
      }

      if (response.data && !response.data.success) {
        console.error('Trading bot error:', response.data.error);
        throw new Error(response.data.error);
      }

      setIsBotActive(!isBotActive);
      
      toast({
        title: isBotActive ? "Робот остановлен" : "Робот запущен",
        description: isBotActive 
          ? "Торговый робот успешно остановлен" 
          : "Торговый робот успешно запущен",
      });
    } catch (error) {
      console.error('Error toggling bot - full error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast({
        title: "Ошибка",
        description: `Не удалось изменить состояние робота: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSignals = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Testing signals for user:', user.id);
      
      const response = await supabase.functions.invoke('trading-bot', {
        body: {
          user_id: user.id,
          action: 'get_signals',
          data: {
            is_demo: isDemo
          }
        }
      });

      console.log('Test signals response:', response);
      
      if (response.error) {
        toast({
          title: "Ошибка тестирования",
          description: response.error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Тест сигналов",
          description: "Проверьте логи в консоли и edge функций",
        });
      }
    } catch (error) {
      console.error('Test signals error:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при тестировании сигналов",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trading Bot</h1>
            <p className="text-muted-foreground">
              Автоматический торговый робот на основе AI сигналов TokenMetrics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Демо режим</span>
              <Switch checked={isDemo} onCheckedChange={setIsDemo} />
              <Badge variant={isDemo ? "secondary" : "destructive"}>
                {isDemo ? "DEMO" : "LIVE"}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={isBotActive ? "destructive" : "default"}
                onClick={handleToggleBot}
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? "..." : (isBotActive ? "Остановить" : "Запустить")}
              </Button>
              <Button
                onClick={handleTestSignals}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                Тест сигналов
              </Button>
              <Badge variant={isBotActive ? "default" : "secondary"}>
                <Activity className="w-3 h-3 mr-1" />
                {isBotActive ? "Активен" : "Остановлен"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Дашборд</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Логи</span>
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>График</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Настройки</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>Портфель</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>История</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Настройте API ключи для начала работы</p>
              <p className="text-sm">Добавьте ключи Bybit и TokenMetrics в разделе ниже, затем перейдите в настройки для конфигурации робота</p>
            </div>

            {/* API Keys Setup */}
            <ApiKeysSetup isDemo={isDemo} />
          </TabsContent>

          <TabsContent value="logs">
            <BotLogs />
          </TabsContent>

          <TabsContent value="chart">
            <PriceChart />
          </TabsContent>

          <TabsContent value="settings">
            <BotSettings />
          </TabsContent>

          <TabsContent value="portfolio">
            <Portfolio />
          </TabsContent>

          <TabsContent value="history">
            <TradingHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}