import { useState } from "react";
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

export function TradingDashboard() {
  const [isDemo, setIsDemo] = useState(true);
  const [isBotActive, setIsBotActive] = useState(false);

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
                onClick={() => setIsBotActive(!isBotActive)}
                className="min-w-[120px]"
              >
                {isBotActive ? "Остановить" : "Запустить"}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Общий P&L</CardTitle>
                  <CardDescription>За последние 24 часа</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">+$125.67</div>
                  <p className="text-sm text-muted-foreground">+2.45% от депозита</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Открытые позиции</CardTitle>
                  <CardDescription>Активные сделки</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2/3</div>
                  <p className="text-sm text-muted-foreground">BTC/USDT, ETH/USDT</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Винрейт</CardTitle>
                  <CardDescription>Процент прибыльных сделок</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">68%</div>
                  <p className="text-sm text-muted-foreground">17 из 25 сделок</p>
                </CardContent>
              </Card>
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