import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Trade {
  id: string;
  created_at: string;
  closed_at?: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  filled_price?: number;
  pnl?: number;
  status: string;
  signal_strength?: number;
}

interface TradingStats {
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  profitableTrades: number;
}

export function TradingHistory() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradingStats>({
    totalTrades: 0,
    winRate: 0,
    avgProfit: 0,
    profitableTrades: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTradingData();
    }
  }, [user]);

  const fetchTradingData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch closed trades from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: closedTrades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'CLOSED')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (tradesError) throw tradesError;

      setTrades(closedTrades || []);

      // Calculate statistics
      if (closedTrades && closedTrades.length > 0) {
        const profitableTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0).length;
        const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        
        setStats({
          totalTrades: closedTrades.length,
          winRate: (profitableTrades / closedTrades.length) * 100,
          avgProfit: profitableTrades > 0 ? (totalPnL / profitableTrades) : 0,
          profitableTrades,
        });
      }

    } catch (error) {
      console.error('Error fetching trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (createdAt: string, closedAt?: string) => {
    if (!closedAt) return 'N/A';
    
    const start = new Date(createdAt);
    const end = new Date(closedAt);
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const calculatePnLPercent = (trade: Trade) => {
    if (!trade.pnl || !trade.filled_price) return 0;
    const investment = trade.filled_price * trade.quantity;
    return (trade.pnl / investment) * 100;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trades">История сделок</TabsTrigger>
          <TabsTrigger value="signals">AI Сигналы</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>История торговых операций</CardTitle>
                  <CardDescription>
                    Все закрытые позиции за последние 30 дней
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Пара</TableHead>
                    <TableHead>Сторона</TableHead>
                    <TableHead>Размер</TableHead>
                    <TableHead>Вход</TableHead>
                    <TableHead>Выход</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Сигнал</TableHead>
                    <TableHead>Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.length > 0 ? (
                    trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-sm">
                          {new Date(trade.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {trade.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'}>
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell>{trade.quantity}</TableCell>
                        <TableCell>${(trade.filled_price || trade.price).toLocaleString()}</TableCell>
                        <TableCell>
                          {trade.status === 'CLOSED' && trade.filled_price ? 
                            `$${trade.filled_price.toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {trade.pnl !== null && trade.pnl !== undefined ? (
                            <div className={`font-medium ${trade.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                              <div className="text-xs">
                                {trade.pnl >= 0 ? '+' : ''}{calculatePnLPercent(trade).toFixed(2)}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {trade.signal_strength ? (
                            <Badge variant="outline">
                              {(trade.signal_strength * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(trade.created_at, trade.closed_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Нет данных о сделках за последние 30 дней
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card>
            <CardHeader>
              <CardTitle>AI торговые сигналы</CardTitle>
              <CardDescription>
                Сигналы от TokenMetrics появятся здесь после запуска робота
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Сигналы пока не поступали</p>
                <p className="text-sm">Запустите торгового робота для получения AI сигналов от TokenMetrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Всего сделок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <p className="text-xs text-muted-foreground">За последние 30 дней</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Винрейт</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.winRate > 50 ? 'text-success' : 'text-muted-foreground'}`}>
              {stats.winRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.profitableTrades} прибыльных из {stats.totalTrades}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Средняя прибыль</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgProfit > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {stats.avgProfit > 0 ? '+' : ''}${stats.avgProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">На прибыльную сделку</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}