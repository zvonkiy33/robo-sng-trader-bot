import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, RefreshCw, PlayCircle, StopCircle, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function BotLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const fetchBotLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      addLog('info', '🔍 Запрос детальных логов работы робота...');
      
      const response = await supabase.functions.invoke('trading-bot', {
        body: {
          user_id: user.id,
          action: 'get_signals',
          data: {
            is_demo: true,
            detailed_logging: true
          }
        }
      });

      if (response.error) {
        addLog('error', `❌ Ошибка получения логов: ${response.error.message}`);
        throw response.error;
      }

      if (response.data?.success) {
        addLog('success', '✅ Логи успешно получены');
        addLog('info', `📊 Найдено сигналов: ${response.data.data?.signals?.length || 0}`);
        
        // Display detailed analysis from the response
        if (response.data.data?.analysis) {
          const analysis = response.data.data.analysis;
          addLog('info', `📈 Анализ завершен`, analysis);
        }
      } else {
        addLog('warning', '⚠️ Получены данные, но возможны проблемы');
      }
      
    } catch (error) {
      console.error('Error fetching bot logs:', error);
      addLog('error', `❌ Ошибка: ${error.message}`);
      toast({
        title: "Ошибка логов",
        description: "Не удалось получить детальные логи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog('info', '⏹️ Автообновление остановлено');
    } else {
      intervalRef.current = setInterval(fetchBotLogs, 30000); // Every 30 seconds
      addLog('info', '🔄 Автообновление включено (каждые 30 сек)');
    }
    setAutoRefresh(!autoRefresh);
  };

  useEffect(() => {
    addLog('info', '🤖 Система логирования торгового робота запущена');
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">SUCCESS</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">WARNING</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">ERROR</Badge>;
      default: return <Badge variant="outline">INFO</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Terminal className="w-5 h-5" />
              <span>Детальные логи робота</span>
            </CardTitle>
            <CardDescription>
              Подробная информация о работе торгового алгоритма в реальном времени
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleAutoRefresh}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              {autoRefresh ? <StopCircle className="w-4 h-4 mr-1" /> : <PlayCircle className="w-4 h-4 mr-1" />}
              {autoRefresh ? "Стоп" : "Авто"}
            </Button>
            <Button
              onClick={fetchBotLogs}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button
              onClick={() => setLogs([])}
              variant="ghost"
              size="sm"
            >
              Очистить
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-black text-green-400 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Нет данных для отображения</p>
                <p className="text-xs">Нажмите "Обновить" для получения логов</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="border-b border-gray-800 pb-2 last:border-b-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 text-xs">[{log.timestamp}]</span>
                      {getLevelBadge(log.level)}
                    </div>
                  </div>
                  <div className={`${getLevelColor(log.level)} whitespace-pre-wrap break-words`}>
                    {log.message}
                  </div>
                  {log.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200">
                        Подробности...
                      </summary>
                      <pre className="mt-1 text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>💡 <strong>Что показывают логи:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>🔍 Анализ входящих сигналов от TokenMetrics</li>
            <li>✅ Проверка лимитов позиций и рисков</li>
            <li>🚀 Исполнение торговых сигналов</li>
            <li>❌ Причины отклонения сигналов</li>
            <li>📊 Статистика и метрики работы</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}