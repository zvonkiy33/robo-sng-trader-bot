import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Activity, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiUsage {
  api_name: string;
  total_requests: number;
  error_count: number;
  avg_response_time: number;
  last_request: string;
}

interface ApiLimits {
  tokenmetrics: {
    used: number;
    total: number;
    period: string;
    last_reset: string;
  };
  bybit: {
    used: number;
    total: number;
    period: string;
    window: string;
  };
}

export function ApiMonitor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);
  const [apiLimits, setApiLimits] = useState<ApiLimits>({
    tokenmetrics: { used: 0, total: 5000, period: "monthly", last_reset: "" },
    bybit: { used: 0, total: 120, period: "per minute", window: "1min" }
  });

  useEffect(() => {
    if (user) {
      loadApiUsage();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadApiUsage, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadApiUsage = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get API usage logs - for TokenMetrics we need monthly data, for Bybit last 24 hours
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data: logs, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      // Get TokenMetrics monthly usage
      const { data: monthlyLogs, error: monthlyError } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('api_name', 'tokenmetrics')
        .gte('created_at', monthStart.toISOString())
        .order('created_at', { ascending: false });

      if (error || monthlyError) throw error || monthlyError;

      // Process logs to get usage statistics (24h for display)
      const usage: Record<string, any> = {};
      
      logs?.forEach(log => {
        if (!usage[log.api_name]) {
          usage[log.api_name] = {
            api_name: log.api_name,
            total_requests: 0,
            error_count: 0,
            response_times: [],
            last_request: log.created_at
          };
        }
        
        usage[log.api_name].total_requests += log.request_count || 1;
        if (log.status_code >= 400) {
          usage[log.api_name].error_count++;
        }
        if (log.response_time_ms) {
          usage[log.api_name].response_times.push(log.response_time_ms);
        }
      });

      // Calculate monthly TokenMetrics usage
      let monthlyTokenmetricsUsage = 0;
      monthlyLogs?.forEach(log => {
        monthlyTokenmetricsUsage += log.request_count || 1;
      });

      // Calculate averages and format data
      const formattedUsage = Object.values(usage).map((api: any) => ({
        api_name: api.api_name,
        total_requests: api.total_requests,
        error_count: api.error_count,
        avg_response_time: api.response_times.length > 0 
          ? Math.round(api.response_times.reduce((a: number, b: number) => a + b, 0) / api.response_times.length)
          : 0,
        last_request: api.last_request
      }));

      setApiUsage(formattedUsage);

      // Update limits based on actual usage
      const bybitUsage = formattedUsage.find(api => api.api_name === 'bybit');

      setApiLimits(prev => ({
        tokenmetrics: {
          ...prev.tokenmetrics,
          used: monthlyTokenmetricsUsage // Use monthly data for TokenMetrics
        },
        bybit: {
          ...prev.bybit,
          used: bybitUsage?.total_requests || 0
        }
      }));

      // Check if TokenMetrics is near limit and show warning
      const tokenmetricsPercentage = (monthlyTokenmetricsUsage / 5000) * 100;
      if (tokenmetricsPercentage >= 80) {
        toast({
          title: "⚠️ Критическое превышение лимитов!",
          description: `TokenMetrics API: ${tokenmetricsPercentage.toFixed(1)}% от месячного лимита. Рассмотрите остановку бота до начала нового месяца.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error loading API usage:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить статистику API",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "default";
  };

  const getStatusIcon = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return <AlertTriangle className="w-4 h-4" />;
    if (percentage >= 70) return <Activity className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Мониторинг</h2>
          <p className="text-muted-foreground">
            Отслеживание использования API лимитов и производительности
          </p>
        </div>
        <Button 
          onClick={loadApiUsage} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* API Limits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TokenMetrics Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>TokenMetrics API</span>
              <Badge variant={getStatusColor(apiLimits.tokenmetrics.used, apiLimits.tokenmetrics.total)}>
                {getStatusIcon(apiLimits.tokenmetrics.used, apiLimits.tokenmetrics.total)}
                {((apiLimits.tokenmetrics.used / apiLimits.tokenmetrics.total) * 100).toFixed(1)}%
              </Badge>
            </CardTitle>
            <CardDescription>
              Лимит: {apiLimits.tokenmetrics.total} запросов в месяц
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Использовано:</span>
                <span className="font-medium">
                  {apiLimits.tokenmetrics.used} / {apiLimits.tokenmetrics.total}
                </span>
              </div>
              <Progress 
                value={(apiLimits.tokenmetrics.used / apiLimits.tokenmetrics.total) * 100}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Остается: {apiLimits.tokenmetrics.total - apiLimits.tokenmetrics.used} запросов (до 1 числа)
              </div>
              {(apiLimits.tokenmetrics.used / apiLimits.tokenmetrics.total) >= 0.9 && (
                <div className="text-xs text-red-600 font-medium">
                  🚨 КРИТИЧЕСКИЙ УРОВЕНЬ - рекомендуется остановить бота
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bybit Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Bybit API</span>
              <Badge variant={getStatusColor(apiLimits.bybit.used, apiLimits.bybit.total)}>
                {getStatusIcon(apiLimits.bybit.used, apiLimits.bybit.total)}
                {((apiLimits.bybit.used / apiLimits.bybit.total) * 100).toFixed(1)}%
              </Badge>
            </CardTitle>
            <CardDescription>
              Лимит: {apiLimits.bybit.total} запросов в минуту
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Использовано (24ч):</span>
                <span className="font-medium">
                  {apiLimits.bybit.used}
                </span>
              </div>
              <Progress 
                value={Math.min((apiLimits.bybit.used / 2880) * 100, 100)} // 2880 = 120 * 24 (daily max)
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Лимит обновляется каждую минуту
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed API Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Детальная статистика (24 часа)</CardTitle>
          <CardDescription>
            Статистика использования API за последние 24 часа
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiUsage.length > 0 ? (
            <div className="space-y-4">
              {apiUsage.map((api) => (
                <div key={api.api_name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{api.api_name}</h3>
                    <Badge variant={api.error_count > 0 ? "destructive" : "default"}>
                      {api.error_count > 0 ? `${api.error_count} ошибок` : "ОК"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Запросов</div>
                      <div className="font-medium">{api.total_requests}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Ошибки</div>
                      <div className="font-medium text-red-600">{api.error_count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Ср. время</div>
                      <div className="font-medium">{api.avg_response_time}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Последний</div>
                      <div className="font-medium">
                        {new Date(api.last_request).toLocaleTimeString('ru-RU')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет данных за последние 24 часа</p>
              <p className="text-sm mt-1">Статистика появится после первых запросов к API</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {(apiLimits.tokenmetrics.used / apiLimits.tokenmetrics.total) > 0.8 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  Предупреждение: высокое использование TokenMetrics API
                </p>
                <p className="text-sm text-orange-700">
                  Использовано {((apiLimits.tokenmetrics.used / apiLimits.tokenmetrics.total) * 100).toFixed(1)}% 
                  от месячного лимита. Рассмотрите возможность увеличения интервалов проверки.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}