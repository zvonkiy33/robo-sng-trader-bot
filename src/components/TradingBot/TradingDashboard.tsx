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
    if (!user) return;

    setLoading(true);
    try {
      const action = isBotActive ? 'stop_bot' : 'start_bot';
      
      const response = await supabase.functions.invoke('trading-bot', {
        body: {
          user_id: user.id,
          action,
          data: {
            is_demo: isDemo,
            settings: {} // Settings will be loaded from DB
          }
        }
      });

      if (response.error) throw response.error;

      setIsBotActive(!isBotActive);
      
      toast({
        title: isBotActive ? "Робот остановлен" : "Робот запущен",
        description: isBotActive 
          ? "Торговый робот успешно остановлен" 
          : "Торговый робот успешно запущен",
      });
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить состояние робота",
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
              <Badge variant={isBotActive ? "default" : "secondary"}>
                <Activity className="w-3 h-3 mr-1" />
                {isBotActive ? "Активен" : "Остановлен"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Дашборд</span>
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