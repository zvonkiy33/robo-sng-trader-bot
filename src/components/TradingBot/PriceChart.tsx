import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface KlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
  price: number;
}

export function PriceChart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<KlineData[]>([]);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    if (user) {
      loadChartData();
    }
  }, [user, symbol, interval, period]);

  const loadChartData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate time range based on period
      const now = Date.now();
      let startTime: number;
      
      switch (period) {
        case '1d':
          startTime = now - 24 * 60 * 60 * 1000;
          break;
        case '7d':
          startTime = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case '30d':
          startTime = now - 30 * 24 * 60 * 60 * 1000;
          break;
        case '90d':
          startTime = now - 90 * 24 * 60 * 60 * 1000;
          break;
        case '1y':
          startTime = now - 365 * 24 * 60 * 60 * 1000;
          break;
        default:
          startTime = now - 7 * 24 * 60 * 60 * 1000;
      }

      console.log('Loading chart data for:', { symbol, interval, period, startTime, endTime: now });

      const response = await supabase.functions.invoke('bybit-api', {
        body: {
          user_id: user.id,
          is_demo: true, // Using demo for public data
          action: 'get_kline_data',
          data: {
            symbol,
            interval,
            startTime,
            endTime: now,
            limit: 1000
          }
        }
      });

      console.log('Chart data response:', response);

      if (response.error) {
        throw response.error;
      }

      if (response.data?.success && response.data?.data?.result?.list) {
        const klineList = response.data.data.result.list;
        
        // Convert Bybit kline data format
        // Bybit returns: [timestamp, open, high, low, close, volume, turnover]
        const processedData: KlineData[] = klineList
          .map((item: string[]) => ({
            timestamp: parseInt(item[0]),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
            date: new Date(parseInt(item[0])).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            price: parseFloat(item[4]) // Use close price for line chart
          }))
          .reverse() // Bybit returns newest first, we want oldest first
          .slice(0, 200); // Limit to 200 points for performance

        setChartData(processedData);
        
        toast({
          title: "Данные загружены",
          description: `Загружено ${processedData.length} точек данных для ${symbol}`,
        });
      } else {
        throw new Error('Неверный формат данных от API');
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast({
        title: "Ошибка загрузки",
        description: `Не удалось загрузить данные: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'price') {
      return [`$${formatPrice(value)}`, 'Цена'];
    }
    return [value, name];
  };

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1]?.price : 0;
  const firstPrice = chartData.length > 0 ? chartData[0]?.price : 0;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>График цены {symbol}</span>
            </CardTitle>
            <CardDescription>
              Исторические данные с Bybit API
            </CardDescription>
          </div>
          
          {currentPrice > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">${formatPrice(currentPrice)}</div>
              <div className={`text-sm ${priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Пара:</span>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                <SelectItem value="DOTUSDT">DOT/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Интервал:</span>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Период:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1д</SelectItem>
                <SelectItem value="7d">7д</SelectItem>
                <SelectItem value="30d">30д</SelectItem>
                <SelectItem value="90d">90д</SelectItem>
                <SelectItem value="1y">1г</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={loadChartData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? "Загрузка..." : "Обновить"}
          </Button>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatPrice}
                />
                <Tooltip 
                  formatter={formatTooltip}
                  labelStyle={{ color: '#000' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            {loading ? (
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse" />
                <p>Загрузка данных...</p>
              </div>
            ) : (
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Нет данных для отображения</p>
                <Button onClick={loadChartData} className="mt-2" size="sm">
                  Загрузить данные
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Максимум</div>
              <div className="font-semibold">
                ${formatPrice(Math.max(...chartData.map(d => d.high)))}
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Минимум</div>
              <div className="font-semibold">
                ${formatPrice(Math.min(...chartData.map(d => d.low)))}
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Средний объем</div>
              <div className="font-semibold">
                {(chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length).toFixed(2)}
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Точек данных</div>
              <div className="font-semibold">{chartData.length}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}