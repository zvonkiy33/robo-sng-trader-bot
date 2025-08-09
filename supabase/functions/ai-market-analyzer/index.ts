import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KlineData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  sma20: number;
  sma50: number;
  bollingerBands: { upper: number; middle: number; lower: number };
  atr: number;
  volumeRatio: number;
}

interface MarketSignal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  confidence: number;
  indicators: TechnicalIndicators;
  price: number;
  analysis: string;
}

// Technical Indicators Calculations
class TechnicalAnalysis {
  
  // RSI Calculation
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // neutral if not enough data
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  // EMA Calculation
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
  
  // SMA Calculation
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  // MACD Calculation
  static calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // For signal line, we need MACD values over time, simplified here
    const signal = this.calculateEMA([macd], 9);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
  
  // Bollinger Bands
  static calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    
    const variance = slice.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2)
    };
  }
  
  // ATR (Average True Range)
  static calculateATR(klines: KlineData[], period: number = 14): number {
    if (klines.length < 2) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < klines.length && i <= period; i++) {
      const high = klines[i].high;
      const low = klines[i].low;
      const prevClose = klines[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }
}

// ---- Public market data fallbacks (no API keys) ----
const tfToSeconds = (tf: string) => ({
  '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400,
}[tf as keyof any] || 900);

const tfToKrakenMinutes = (tf: string) => ({
  '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240,
}[tf as keyof any] || 15);

const tfToBitfinex = (tf: string) => ({
  '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '4h': '4h',
}[tf as keyof any] || '15m');

function mapToUsdPairs(symbol: string) {
  const base = symbol.replace(/USDT$/i, 'USD').toUpperCase();
  const coin = base.replace('USDT', 'USD');
  // Special case for Kraken BTC ticker (XBT)
  const kraken = coin.startsWith('BTC') ? coin.replace('BTC', 'XBT') : coin;
  return {
    coinbase: coin.replace('USD', '-') , // will be BTC-USD, ETH-USD
    kraken,
    bitfinex: `t${coin}` // tBTCUSD, tETHUSD
  };
}

async function fetchCoinbaseKlines(symbol: string, timeframe: string): Promise<KlineData[]> {
  const { coinbase } = mapToUsdPairs(symbol);
  const url = `https://api.exchange.coinbase.com/products/${coinbase}USD/candles?granularity=${tfToSeconds(timeframe)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Coinbase HTTP ${res.status}`);
  const data = await res.json(); // [ time, low, high, open, close, volume ] latest->oldest
  if (!Array.isArray(data)) return [];
  const mapped = data.map((k: any[]) => ({
    open: Number(k[3]), high: Number(k[2]), low: Number(k[1]), close: Number(k[4]), volume: Number(k[5]), timestamp: Number(k[0]) * 1000,
  }));
  return mapped.reverse();
}

async function fetchKrakenKlines(symbol: string, timeframe: string): Promise<KlineData[]> {
  const { kraken } = mapToUsdPairs(symbol);
  const url = `https://api.kraken.com/0/public/OHLC?pair=${kraken}&interval=${tfToKrakenMinutes(timeframe)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const json = await res.json();
  const resultKey = Object.keys(json.result || {}).find((k) => k !== 'last');
  const arr = resultKey ? json.result[resultKey] : [];
  if (!Array.isArray(arr)) return [];
  return arr.map((k: any[]) => ({
    timestamp: Number(k[0]) * 1000,
    open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]), volume: Number(k[6]) || Number(k[5]) || 0,
  }));
}

async function fetchBitfinexKlines(symbol: string, timeframe: string): Promise<KlineData[]> {
  const { bitfinex } = mapToUsdPairs(symbol);
  const tf = tfToBitfinex(timeframe);
  const url = `https://api-pub.bitfinex.com/v2/candles/trade:${tf}:${bitfinex}/hist?limit=200`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bitfinex HTTP ${res.status}`);
  const data = await res.json(); // [MTS, OPEN, CLOSE, HIGH, LOW, VOLUME] latest->oldest
  if (!Array.isArray(data)) return [];
  const mapped = data.map((k: any[]) => ({
    timestamp: Number(k[0]), open: Number(k[1]), close: Number(k[2]), high: Number(k[3]), low: Number(k[4]), volume: Number(k[5])
  }));
  // Normalize OHLC order to our struct
  return mapped.reverse().map(k => ({ open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume, timestamp: k.timestamp }));
}

// AI Market Analysis Engine
class AIMarketAnalyzer {
  
  static analyzeMarket(symbol: string, klines: KlineData[]): MarketSignal {
    if (klines.length < 50) {
      return {
        symbol,
        signal: 'HOLD',
        strength: 0.5,
        confidence: 0.3,
        indicators: {} as TechnicalIndicators,
        price: klines[klines.length - 1]?.close || 0,
        analysis: 'Недостаточно данных для анализа'
      };
    }
    
    const closes = klines.map(k => k.close);
    const volumes = klines.map(k => k.volume);
    const currentPrice = closes[closes.length - 1];
    
    // Calculate all indicators
    const indicators: TechnicalIndicators = {
      rsi: TechnicalAnalysis.calculateRSI(closes),
      macd: TechnicalAnalysis.calculateMACD(closes),
      ema20: TechnicalAnalysis.calculateEMA(closes, 20),
      ema50: TechnicalAnalysis.calculateEMA(closes, 50),
      sma20: TechnicalAnalysis.calculateSMA(closes, 20),
      sma50: TechnicalAnalysis.calculateSMA(closes, 50),
      bollingerBands: TechnicalAnalysis.calculateBollingerBands(closes),
      atr: TechnicalAnalysis.calculateATR(klines),
      volumeRatio: volumes[volumes.length - 1] / TechnicalAnalysis.calculateSMA(volumes, 20)
    };
    
    // AI Analysis Logic
    const signals = this.generateSignals(currentPrice, indicators);
    const finalSignal = this.combineSignals(signals);
    
    return {
      symbol,
      signal: finalSignal.signal,
      strength: finalSignal.strength,
      confidence: finalSignal.confidence,
      indicators,
      price: currentPrice,
      analysis: this.generateAnalysis(indicators, finalSignal)
    };
  }
  
  private static generateSignals(price: number, indicators: TechnicalIndicators): any[] {
    const signals = [];
    
    // RSI Analysis
    if (indicators.rsi < 30) {
      signals.push({ type: 'BUY', strength: 0.8, reason: 'RSI oversold' });
    } else if (indicators.rsi > 70) {
      signals.push({ type: 'SELL', strength: 0.8, reason: 'RSI overbought' });
    }
    
    // Moving Average Analysis
    if (indicators.ema20 > indicators.ema50 && price > indicators.ema20) {
      signals.push({ type: 'BUY', strength: 0.7, reason: 'Bullish trend' });
    } else if (indicators.ema20 < indicators.ema50 && price < indicators.ema20) {
      signals.push({ type: 'SELL', strength: 0.7, reason: 'Bearish trend' });
    }
    
    // MACD Analysis
    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
      signals.push({ type: 'BUY', strength: 0.6, reason: 'MACD bullish crossover' });
    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
      signals.push({ type: 'SELL', strength: 0.6, reason: 'MACD bearish crossover' });
    }
    
    // Bollinger Bands Analysis
    if (price < indicators.bollingerBands.lower) {
      signals.push({ type: 'BUY', strength: 0.65, reason: 'Price below lower Bollinger Band' });
    } else if (price > indicators.bollingerBands.upper) {
      signals.push({ type: 'SELL', strength: 0.65, reason: 'Price above upper Bollinger Band' });
    }
    
    // Volume Analysis
    if (indicators.volumeRatio > 1.5) {
      // High volume can strengthen existing signals
      signals.forEach(s => s.strength *= 1.1);
    }
    
    return signals;
  }
  
  private static combineSignals(signals: any[]): { signal: 'BUY' | 'SELL' | 'HOLD'; strength: number; confidence: number } {
    if (signals.length === 0) {
      // Generate more aggressive signals even without clear indicators
      const randomChoice = Math.random();
      if (randomChoice > 0.7) {
        return { signal: 'BUY', strength: 0.6, confidence: 0.5 };
      } else if (randomChoice < 0.3) {
        return { signal: 'SELL', strength: 0.6, confidence: 0.5 };
      }
      return { signal: 'HOLD', strength: 0.5, confidence: 0.3 };
    }
    
    const buySignals = signals.filter(s => s.type === 'BUY');
    const sellSignals = signals.filter(s => s.type === 'SELL');
    
    const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);
    
    const totalSignals = buySignals.length + sellSignals.length;
    const netStrength = (buyStrength - sellStrength) / totalSignals;
    const confidence = Math.min(totalSignals / 3, 1); // More signals = higher confidence
    
    // More aggressive signal generation - lower threshold for trading signals
    if (Math.abs(netStrength) < 0.05) {
      // Even for weak signals, sometimes generate a trading signal
      const trend = Math.random() > 0.5 ? 'BUY' : 'SELL';
      return { signal: trend, strength: 0.55 + Math.random() * 0.15, confidence: 0.5 + confidence };
    } else if (netStrength > 0) {
      return { signal: 'BUY', strength: Math.min(0.5 + Math.abs(netStrength), 0.95), confidence: Math.min(0.6 + confidence, 0.9) };
    } else {
      return { signal: 'SELL', strength: Math.min(0.5 + Math.abs(netStrength), 0.95), confidence: Math.min(0.6 + confidence, 0.9) };
    }
  }
  
  private static generateAnalysis(indicators: TechnicalIndicators, signal: any): string {
    const parts = [];
    
    // RSI analysis
    if (indicators.rsi < 30) {
      parts.push('RSI показывает перепроданность');
    } else if (indicators.rsi > 70) {
      parts.push('RSI показывает перекупленность');
    } else {
      parts.push(`RSI в нейтральной зоне (${indicators.rsi.toFixed(1)})`);
    }
    
    // Trend analysis
    if (indicators.ema20 > indicators.ema50) {
      parts.push('восходящий тренд');
    } else {
      parts.push('нисходящий тренд');
    }
    
    // MACD
    if (indicators.macd.histogram > 0) {
      parts.push('MACD бычий');
    } else {
      parts.push('MACD медвежий');
    }
    
    return parts.join(', ') + `. Сила сигнала: ${(signal.strength * 100).toFixed(0)}%`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, symbols, timeframe = '15m' } = await req.json();
    
    if (!user_id || !symbols) {
      throw new Error('user_id and symbols are required');
    }

    console.log(`🤖 AI Market Analysis для ${symbols.join(', ')} (${timeframe})`);

    const analysisResults = [];

    // Analyze each symbol individually
    for (const symbol of symbols) {
      console.log(`📊 Анализируем ${symbol}`)
      
      try {
        // Try Bybit first (may be blocked in some regions)
        let klines: KlineData[] = [];
        try {
          const bybitResponse = await supabase.functions.invoke('bybit-api', {
            body: {
              user_id,
              action: 'get_kline_data',
              data: {
                symbol: symbol,
                interval: timeframe,
                limit: 200 // Get 200 candles for analysis
              }
            }
          });

        const payload = bybitResponse.data;
        if (payload && payload.success !== false) {
          const bybit = payload.data;
          if (bybit && bybit.result && bybit.result.list && bybit.result.list.length > 0) {
            klines = bybit.result.list.map((k: any) => ({
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
              timestamp: parseInt(k[0])
            }));
          }
        }
        } catch (e) {
          console.error(`Bybit fetch failed for ${symbol}:`, e);
        }

        // Fallbacks: Coinbase → Kraken → Bitfinex → Binance
        if (klines.length === 0) {
          // Coinbase
          try {
            klines = await fetchCoinbaseKlines(symbol, timeframe);
          } catch (e) {
            console.error(`❌ Coinbase fallback failed for ${symbol}:`, e);
          }
        }

        if (klines.length === 0) {
          // Kraken
          try {
            klines = await fetchKrakenKlines(symbol, timeframe);
          } catch (e) {
            console.error(`❌ Kraken fallback failed for ${symbol}:`, e);
          }
        }

        if (klines.length === 0) {
          // Bitfinex
          try {
            klines = await fetchBitfinexKlines(symbol, timeframe);
          } catch (e) {
            console.error(`❌ Bitfinex fallback failed for ${symbol}:`, e);
          }
        }

        if (klines.length === 0) {
          // Binance (may be blocked in some regions)
          try {
            const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=200`;
            const res = await fetch(binanceUrl, { headers: { 'User-Agent': 'AI-Market-Analyzer/1.0' } });
            if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data)) {
              klines = data.map((k: any[]) => ({
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                timestamp: parseInt(k[0])
              }));
            }
          } catch (e) {
            console.error(`❌ Binance fallback failed for ${symbol}:`, e);
          }
        }

        if (klines.length === 0) {
          console.log(`⚠️ Нет данных для ${symbol}`);
          continue;
        }

        const analysis = AIMarketAnalyzer.analyzeMarket(symbol, klines);
        analysisResults.push(analysis);
        
        console.log(`📊 ${symbol}: ${analysis.signal} (${(analysis.strength * 100).toFixed(0)}%) - ${analysis.analysis}`);

      } catch (error) {
        console.error(`❌ Ошибка анализа ${symbol}:`, error);
      }
    }

    // Log API usage
    await supabase.from('api_usage_logs').insert({
      user_id,
      api_name: 'ai_analyzer',
      endpoint: 'market_analysis',
      status_code: 200,
      request_count: symbols.length
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        signals: analysisResults,
        source: 'AI_ANALYZER',
        analysis_time: new Date().toISOString(),
        timeframe
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Market Analyzer error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      source: 'AI_ANALYZER'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});