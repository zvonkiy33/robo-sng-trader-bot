import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface PortfolioData {
  totalBalance: number;
  availableBalance: number;
  unrealizedPnL: number;
  dailyPnL: number;
  totalPnL: number;
  openPositions: Array<{
    symbol: string;
    side: string;
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    stopLoss?: number;
    takeProfit?: number;
  }>;
}

export function Portfolio() {
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    totalBalance: 0,
    availableBalance: 0,
    unrealizedPnL: 0,
    dailyPnL: 0,
    totalPnL: 0,
    openPositions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

  const fetchPortfolioData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch open trades
      const { data: openTrades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'OPEN');

      if (tradesError) throw tradesError;

      // Fetch today's trades for daily P&L
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTrades, error: todayError } = await supabase
        .from('trades')
        .select('pnl')
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00Z');

      if (todayError) throw todayError;

      // Fetch all closed trades for total P&L
      const { data: allTrades, error: allError } = await supabase
        .from('trades')
        .select('pnl')
        .eq('user_id', user.id)
        .eq('status', 'CLOSED');

      if (allError) throw allError;

      // Calculate portfolio metrics
      const mockBalance = 5000; // This would come from Bybit API
      const dailyPnL = todayTrades?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
      const totalPnL = allTrades?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
      
      // Mock current prices - these would come from real market data
      const mockPrices: { [key: string]: number } = {
        'BTCUSDT': 43200,
        'ETHUSDT': 2620,
        'ADAUSDT': 0.51,
      };

      const openPositions = openTrades?.map(trade => {
        // Skip HOLD positions from P&L calculations
        if (trade.side === 'HOLD') {
          return {
            symbol: trade.symbol || '',
            side: trade.side || '',
            size: trade.quantity || 0,
            entryPrice: 0,
            currentPrice: mockPrices[trade.symbol] || 0,
            pnl: 0,
            pnlPercent: 0,
            stopLoss: trade.stop_loss,
            takeProfit: trade.take_profit,
          };
        }

        const currentPrice = mockPrices[trade.symbol] || trade.price || 0;
        const entryPrice = trade.filled_price || trade.price || 0;
        
        // Only calculate P&L for actual trades with valid entry prices
        const pnl = entryPrice > 0 ? (trade.side === 'BUY' 
          ? (currentPrice - entryPrice) * (trade.quantity || 0)
          : (entryPrice - currentPrice) * (trade.quantity || 0)) : 0;
        
        const pnlPercent = entryPrice > 0 && trade.quantity > 0 
          ? ((pnl / (entryPrice * trade.quantity)) * 100) : 0;

        return {
          symbol: trade.symbol || '',
          side: trade.side || '',
          size: trade.quantity || 0,
          entryPrice,
          currentPrice,
          pnl,
          pnlPercent,
          stopLoss: trade.stop_loss,
          takeProfit: trade.take_profit,
        };
      }) || [];

      const unrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.pnl, 0);
      const usedBalance = openPositions.reduce((sum, pos) => sum + (pos.entryPrice * pos.size), 0);

      setPortfolioData({
        totalBalance: mockBalance,
        availableBalance: mockBalance - usedBalance,
        unrealizedPnL,
        dailyPnL,
        totalPnL,
        openPositions,
      });

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Общий баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioData.totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Доступно: ${portfolioData.availableBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Дневной P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolioData.dailyPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {portfolioData.dailyPnL >= 0 ? '+' : ''}${portfolioData.dailyPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((portfolioData.dailyPnL / portfolioData.totalBalance) * 100).toFixed(2)}% от депозита
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Нереализованный P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolioData.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {portfolioData.unrealizedPnL >= 0 ? '+' : ''}${portfolioData.unrealizedPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Открытые позиции</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Общий P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolioData.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {portfolioData.totalPnL >= 0 ? '+' : ''}${portfolioData.totalPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((portfolioData.totalPnL / portfolioData.totalBalance) * 100).toFixed(2)}% ROI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Открытые позиции</CardTitle>
          <CardDescription>
            Текущие активные сделки ({portfolioData.openPositions.length}/3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioData.openPositions.map((position, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant={position.side === 'BUY' ? 'default' : 'destructive'}>
                      {position.side}
                    </Badge>
                    <span className="font-semibold">{position.symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      Размер: {position.size}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                    </div>
                    <div className={`text-sm ${position.pnlPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Цена входа: </span>
                    <span className="font-medium">${position.entryPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Текущая цена: </span>
                    <span className="font-medium">${position.currentPrice.toLocaleString()}</span>
                  </div>
                </div>

                {(position.stopLoss || position.takeProfit) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {position.stopLoss && <span>Stop Loss: ${position.stopLoss.toFixed(2)}</span>}
                      {position.takeProfit && <span>Take Profit: ${position.takeProfit.toFixed(2)}</span>}
                    </div>
                    {position.stopLoss && position.takeProfit && (
                      <Progress 
                        value={Math.min(Math.max(((position.currentPrice - position.stopLoss) / (position.takeProfit - position.stopLoss)) * 100, 0), 100)} 
                        className="h-2"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {portfolioData.openPositions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Нет открытых позиций</p>
                <p className="text-sm">Робот будет открывать позиции при получении сильных сигналов</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Balance Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Распределение баланса</CardTitle>
          <CardDescription>
            Как используется депозит
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Доступные средства</span>
              <span className="font-medium">${portfolioData.availableBalance.toLocaleString()}</span>
            </div>
            <Progress value={(portfolioData.availableBalance / portfolioData.totalBalance) * 100} className="h-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-sm">В открытых позициях</span>
              <span className="font-medium">${(portfolioData.totalBalance - portfolioData.availableBalance).toLocaleString()}</span>
            </div>
            <Progress value={((portfolioData.totalBalance - portfolioData.availableBalance) / portfolioData.totalBalance) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}