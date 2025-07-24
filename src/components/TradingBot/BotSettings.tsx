import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings2, Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BotSettings() {
  const [settings, setSettings] = useState({
    isActive: false,
    maxPositions: 3,
    positionSizePercent: 1,
    stopLossPercent: 2,
    takeProfitPercent: 4,
    dailyLossLimitPercent: 5,
    minSignalStrength: 0.7,
    tradingPairs: ["BTCUSDT", "ETHUSDT"],
  });

  const { toast } = useToast();

  const handleSaveSettings = () => {
    toast({
      title: "Настройки сохранены",
      description: "Параметры торгового робота обновлены",
    });
  };

  return (
    <div className="space-y-6">
      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Управление рисками</span>
          </CardTitle>
          <CardDescription>
            Настройки безопасности и лимитов торговли
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Максимум позиций одновременно</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.maxPositions]}
                    onValueChange={(value) => 
                      setSettings({ ...settings, maxPositions: value[0] })
                    }
                    max={5}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="min-w-[3rem]">
                    {settings.maxPositions}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Размер позиции (% от депозита)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.positionSizePercent]}
                    onValueChange={(value) => 
                      setSettings({ ...settings, positionSizePercent: value[0] })
                    }
                    max={5}
                    min={0.5}
                    step={0.5}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="min-w-[3rem]">
                    {settings.positionSizePercent}%
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Дневной лимит потерь (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.dailyLossLimitPercent]}
                    onValueChange={(value) => 
                      setSettings({ ...settings, dailyLossLimitPercent: value[0] })
                    }
                    max={10}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="destructive" className="min-w-[3rem]">
                    -{settings.dailyLossLimitPercent}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Стоп-лосс (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.stopLossPercent]}
                    onValueChange={(value) => 
                      setSettings({ ...settings, stopLossPercent: value[0] })
                    }
                    max={5}
                    min={1}
                    step={0.5}
                    className="flex-1"
                  />
                  <Badge variant="destructive" className="min-w-[3rem]">
                    -{settings.stopLossPercent}%
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Тейк-профит (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.takeProfitPercent]}
                    onValueChange={(value) => 
                      setSettings({ ...settings, takeProfitPercent: value[0] })
                    }
                    max={10}
                    min={2}
                    step={0.5}
                    className="flex-1"
                  />
                  <Badge variant="default" className="min-w-[3rem]">
                    +{settings.takeProfitPercent}%
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Минимальная сила сигнала</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.minSignalStrength]}
                    onValueChange={(value) => 
                      setSettings({ ...settings, minSignalStrength: value[0] })
                    }
                    max={1}
                    min={0.5}
                    step={0.05}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="min-w-[3rem]">
                    {(settings.minSignalStrength * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Торговые настройки</span>
          </CardTitle>
          <CardDescription>
            Параметры торговых пар и стратегии
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Торговые пары</Label>
            <div className="flex flex-wrap gap-2">
              {["BTCUSDT", "ETHUSDT", "ADAUSDT", "DOTUSDT", "LINKUSDT"].map((pair) => (
                <Badge
                  key={pair}
                  variant={settings.tradingPairs.includes(pair) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newPairs = settings.tradingPairs.includes(pair)
                      ? settings.tradingPairs.filter(p => p !== pair)
                      : [...settings.tradingPairs, pair];
                    setSettings({ ...settings, tradingPairs: newPairs });
                  }}
                >
                  {pair}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Важное предупреждение
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Торговля криптовалютами связана с высокими рисками. Используйте только те средства, 
                потерю которых вы можете себе позволить. Начните с демо-счета для тестирования стратегии.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} size="lg">
          <Settings2 className="w-4 h-4 mr-2" />
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}