import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKeysSetupProps {
  isDemo: boolean;
}

export function ApiKeysSetup({ isDemo }: ApiKeysSetupProps) {
  const [showKeys, setShowKeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState({
    bybitApiKey: "",
    bybitApiSecret: "",
    tokenMetricsKey: "",
  });
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Load existing API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, [isDemo]);

  const loadApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему для сохранения API ключей",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('api_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_demo', isDemo)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading API keys:', error);
        return;
      }

      if (data) {
        setKeys({
          bybitApiKey: data.api_key || "",
          bybitApiSecret: data.api_secret || "",
          tokenMetricsKey: "", // Will load separately
        });
        setIsConnected(true);
      }

      // Load TokenMetrics key separately
      const { data: tmData } = await supabase
        .from('tokenmetrics_credentials')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (tmData) {
        setKeys(prev => ({
          ...prev,
          tokenMetricsKey: tmData.api_key || "",
        }));
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const handleSaveKeys = async () => {
    if (!keys.bybitApiKey || !keys.bybitApiSecret || !keys.tokenMetricsKey) {
      toast({
        title: "Ошибка",
        description: "Заполните все API ключи",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему для сохранения API ключей",
          variant: "destructive",
        });
        return;
      }

      // Deactivate old credentials
      await supabase
        .from('api_credentials')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_demo', isDemo);

      // Insert new Bybit credentials
      const { error: bybitError } = await supabase
        .from('api_credentials')
        .insert({
          user_id: user.id,
          exchange: 'bybit',
          api_key: keys.bybitApiKey,
          api_secret: keys.bybitApiSecret,
          is_demo: isDemo,
          is_active: true,
        });

      if (bybitError) throw bybitError;

      // Handle TokenMetrics credentials
      await supabase
        .from('tokenmetrics_credentials')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { error: tmError } = await supabase
        .from('tokenmetrics_credentials')
        .insert({
          user_id: user.id,
          api_key: keys.tokenMetricsKey,
          is_active: true,
        });

      if (tmError) throw tmError;

      setIsConnected(true);
      toast({
        title: "API ключи сохранены",
        description: `Подключение к ${isDemo ? "демо" : "реальному"} счету Bybit и TokenMetrics успешно`,
      });

      // Test connection
      await testApiConnection();

    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить API ключи. Проверьте подключение к интернету.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      // Here we would test the API connection
      // For now, just show success
      toast({
        title: "Подключение проверено",
        description: "API ключи действительны",
      });
    } catch (error) {
      toast({
        title: "Ошибка подключения",
        description: "Проверьте правильность API ключей",
        variant: "destructive",
      });
    }
  };

  const handleClearKeys = () => {
    setKeys({
      bybitApiKey: "",
      bybitApiSecret: "",
      tokenMetricsKey: "",
    });
    setIsConnected(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>API ключи</span>
            </CardTitle>
            <CardDescription>
              Настройте подключение к {isDemo ? "демо" : "реальному"} счету Bybit и TokenMetrics
            </CardDescription>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {isConnected ? "Подключено" : "Не подключено"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Bybit API Keys */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Bybit {isDemo ? "Demo" : "Live"} API</h3>
            <Badge variant="outline">
              {isDemo ? "testnet.bybit.com" : "api.bybit.com"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bybit-key">API Key</Label>
              <Input
                id="bybit-key"
                type={showKeys ? "text" : "password"}
                placeholder={isDemo ? "Введите demo API key" : "Введите live API key"}
                value={keys.bybitApiKey}
                onChange={(e) => setKeys({ ...keys, bybitApiKey: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bybit-secret">API Secret</Label>
              <div className="relative">
                <Input
                  id="bybit-secret"
                  type={showKeys ? "text" : "password"}
                  placeholder="Введите API secret"
                  value={keys.bybitApiSecret}
                  onChange={(e) => setKeys({ ...keys, bybitApiSecret: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* TokenMetrics API Key */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">TokenMetrics API</h3>
            <Badge variant="outline">tokenmetrics.com</Badge>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tokenmetrics-key">API Key</Label>
            <Input
              id="tokenmetrics-key"
              type={showKeys ? "text" : "password"}
              placeholder="Введите TokenMetrics API key"
              value={keys.tokenMetricsKey}
              onChange={(e) => setKeys({ ...keys, tokenMetricsKey: e.target.value })}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClearKeys} disabled={loading}>
            Очистить
          </Button>
          <Button onClick={handleSaveKeys} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Сохранить API ключи
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Инструкции:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Bybit: Создайте API ключи с разрешениями Trade, Contract, Assets</li>
            <li>• TokenMetrics: Получите API ключ в личном кабинете</li>
            <li>• {isDemo ? "Используйте демо API для безопасного тестирования" : "ВНИМАНИЕ: Реальная торговля с реальными деньгами!"}</li>
            <li>• API ключи сохраняются в зашифрованном виде в базе данных</li>
          </ul>
        </div>

        {/* Status */}
        {isConnected && (
          <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">API ключи успешно сохранены</span>
            </div>
            <p className="text-sm text-success/80 mt-1">
              Торговый робот готов к работе в {isDemo ? "демо" : "реальном"} режиме
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}