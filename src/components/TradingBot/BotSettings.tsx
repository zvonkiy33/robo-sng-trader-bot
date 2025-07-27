import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";

interface BotSettingsType {
  is_active: boolean;
  max_positions: number;
  position_size_percent: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  daily_loss_limit_percent: number;
  min_signal_strength: number;
  timeframe: string;
  trading_pairs: string[];
}

export const BotSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BotSettingsType>({
    is_active: false,
    max_positions: 3,
    position_size_percent: 1.0,
    stop_loss_percent: 2.0,
    take_profit_percent: 4.0,
    daily_loss_limit_percent: 5.0,
    min_signal_strength: 0.7,
    timeframe: "15m",
    trading_pairs: ["BTCUSDT", "ETHUSDT"]
  });
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bot_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading bot settings:', error);
        return;
      }

      if (data) {
        setSettings({
          is_active: data.is_active,
          max_positions: data.max_positions,
          position_size_percent: data.position_size_percent,
          stop_loss_percent: data.stop_loss_percent,
          take_profit_percent: data.take_profit_percent,
          daily_loss_limit_percent: data.daily_loss_limit_percent,
          min_signal_strength: data.min_signal_strength,
          timeframe: data.timeframe || "15m",
          trading_pairs: data.trading_pairs || ["BTCUSDT", "ETHUSDT"]
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('bot_settings')
        .upsert({
          user_id: user.id,
          is_active: settings.is_active,
          max_positions: settings.max_positions,
          position_size_percent: settings.position_size_percent,
          stop_loss_percent: settings.stop_loss_percent,
          take_profit_percent: settings.take_profit_percent,
          daily_loss_limit_percent: settings.daily_loss_limit_percent,
          min_signal_strength: settings.min_signal_strength,
          timeframe: settings.timeframe,
          trading_pairs: settings.trading_pairs,
          is_demo: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Настройки сохранены",
        description: "Настройки торгового бота успешно обновлены",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Настройки торгового бота</CardTitle>
          <CardDescription>
            Конфигурируйте параметры автоматической торговли
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bot Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="bot-active">Статус бота</Label>
              <p className="text-sm text-muted-foreground">
                Включить/выключить автоматическую торговлю
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="bot-active"
                checked={settings.is_active}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, is_active: checked }))
                }
              />
              <Badge variant={settings.is_active ? "default" : "secondary"}>
                {settings.is_active ? "Активен" : "Неактивен"}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Risk Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Управление рисками</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Максимум позиций</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.max_positions]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, max_positions: value[0] }))
                    }
                    max={10}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.max_positions}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Размер позиции (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.position_size_percent]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, position_size_percent: value[0] }))
                    }
                    max={10}
                    min={0.1}
                    step={0.1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.position_size_percent}%</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Стоп-лосс (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.stop_loss_percent]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, stop_loss_percent: value[0] }))
                    }
                    max={10}
                    min={0.5}
                    step={0.1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.stop_loss_percent}%</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Тейк-профит (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.take_profit_percent]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, take_profit_percent: value[0] }))
                    }
                    max={20}
                    min={1}
                    step={0.1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.take_profit_percent}%</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Дневной лимит потерь (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.daily_loss_limit_percent]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, daily_loss_limit_percent: value[0] }))
                    }
                    max={20}
                    min={1}
                    step={0.5}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.daily_loss_limit_percent}%</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Минимальная сила сигнала (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[settings.min_signal_strength * 100]}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, min_signal_strength: value[0] / 100 }))
                    }
                    max={100}
                    min={50}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{Math.round(settings.min_signal_strength * 100)}%</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trading Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Торговые настройки</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Таймфрейм сигналов</Label>
                <Select
                  value={settings.timeframe}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, timeframe: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">5 минут</SelectItem>
                    <SelectItem value="15m">15 минут</SelectItem>
                    <SelectItem value="30m">30 минут</SelectItem>
                    <SelectItem value="1h">1 час</SelectItem>
                    <SelectItem value="4h">4 часа</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Торговые пары</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.trading_pairs.map((pair) => (
                    <Badge key={pair} variant="outline">
                      {pair}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Сейчас поддерживаются: BTC/USDT, ETH/USDT
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Warning */}
          <div className="flex items-start space-x-3 p-4 border border-orange-200 bg-orange-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-800">
                Предупреждение о рисках
              </p>
              <p className="text-sm text-orange-700">
                Автоматическая торговля связана с высокими рисками. Торгуйте только теми средствами, 
                которые можете позволить себе потерять. Прошлые результаты не гарантируют будущие прибыли.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};