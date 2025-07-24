import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Activity } from "lucide-react";

export function TradingHistory() {
  const trades = [
    {
      id: "1",
      date: "2024-01-24 14:30",
      symbol: "BTCUSDT",
      side: "BUY",
      size: 0.05,
      entryPrice: 42500,
      exitPrice: 43200,
      pnl: 35.00,
      pnlPercent: 1.65,
      status: "CLOSED",
      signalStrength: 0.85,
      duration: "2h 15m",
    },
    {
      id: "2", 
      date: "2024-01-24 12:15",
      symbol: "ETHUSDT",
      side: "BUY", 
      size: 2.5,
      entryPrice: 2580,
      exitPrice: 2620,
      pnl: 100.00,
      pnlPercent: 1.55,
      status: "CLOSED",
      signalStrength: 0.78,
      duration: "1h 45m",
    },
    {
      id: "3",
      date: "2024-01-24 10:00",
      symbol: "ADAUSDT", 
      side: "BUY",
      size: 1000,
      entryPrice: 0.52,
      exitPrice: 0.51,
      pnl: -10.00,
      pnlPercent: -1.92,
      status: "CLOSED",
      signalStrength: 0.72,
      duration: "45m",
    },
    {
      id: "4",
      date: "2024-01-24 08:30",
      symbol: "BTCUSDT",
      side: "BUY",
      size: 0.03,
      entryPrice: 42000,
      exitPrice: 43680,
      pnl: 50.40,
      pnlPercent: 4.00,
      status: "CLOSED", 
      signalStrength: 0.92,
      duration: "3h 20m",
    },
  ];

  const signals = [
    {
      id: "1",
      timestamp: "2024-01-24 15:00",
      symbol: "BTCUSDT",
      signal: "BUY",
      strength: 0.88,
      price: 43100,
      status: "EXECUTED",
      reason: "Strong bullish momentum detected",
    },
    {
      id: "2",
      timestamp: "2024-01-24 14:45", 
      symbol: "ETHUSDT",
      signal: "SELL",
      strength: 0.65,
      price: 2610,
      status: "IGNORED",
      reason: "Signal strength below threshold (0.70)",
    },
    {
      id: "3",
      timestamp: "2024-01-24 14:30",
      symbol: "DOTUSDT",
      signal: "BUY", 
      strength: 0.82,
      price: 7.25,
      status: "IGNORED",
      reason: "Maximum positions limit reached (3/3)",
    },
  ];

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
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="text-sm">
                        {trade.date}
                      </TableCell>
                      <TableCell className="font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'}>
                          {trade.side}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.size}</TableCell>
                      <TableCell>${trade.entryPrice.toLocaleString()}</TableCell>
                      <TableCell>${trade.exitPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className={`font-medium ${trade.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          <div className="text-xs">
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(trade.signalStrength * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {trade.duration}
                      </TableCell>
                    </TableRow>
                  ))}
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
                Сигналы от TokenMetrics и их обработка роботом
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead>Пара</TableHead>
                    <TableHead>Сигнал</TableHead>
                    <TableHead>Сила</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Причина</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell className="text-sm">
                        {signal.timestamp}
                      </TableCell>
                      <TableCell className="font-medium">
                        {signal.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant={signal.signal === 'BUY' ? 'default' : 'destructive'}>
                          {signal.signal === 'BUY' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {signal.signal}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={signal.strength >= 0.8 ? 'default' : signal.strength >= 0.7 ? 'secondary' : 'outline'}
                        >
                          {(signal.strength * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>${signal.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={signal.status === 'EXECUTED' ? 'default' : 'secondary'}
                        >
                          {signal.status === 'EXECUTED' ? (
                            <Activity className="w-3 h-3 mr-1" />
                          ) : null}
                          {signal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        {signal.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">За последние 30 дней</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Винрейт</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">68%</div>
            <p className="text-xs text-muted-foreground">17 прибыльных из 25</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Средняя прибыль</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+1.85%</div>
            <p className="text-xs text-muted-foreground">На прибыльную сделку</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}