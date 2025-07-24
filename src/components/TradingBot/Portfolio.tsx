import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export function Portfolio() {
  const portfolioData = {
    totalBalance: 5000,
    availableBalance: 4500,
    unrealizedPnL: 125.67,
    dailyPnL: 85.32,
    totalPnL: 456.78,
    openPositions: [
      {
        symbol: "BTCUSDT",
        side: "BUY",
        size: 0.05,
        entryPrice: 42500,
        currentPrice: 43200,
        pnl: 35.00,
        pnlPercent: 1.65,
      },
      {
        symbol: "ETHUSDT", 
        side: "BUY",
        size: 2.5,
        entryPrice: 2580,
        currentPrice: 2620,
        pnl: 100.00,
        pnlPercent: 1.55,
      },
    ],
  };

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

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Stop Loss: ${(position.entryPrice * 0.98).toFixed(2)}</span>
                    <span>Take Profit: ${(position.entryPrice * 1.04).toFixed(2)}</span>
                  </div>
                  <Progress 
                    value={Math.min(Math.max(((position.currentPrice - position.entryPrice * 0.98) / (position.entryPrice * 1.04 - position.entryPrice * 0.98)) * 100, 0), 100)} 
                    className="h-2"
                  />
                </div>
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