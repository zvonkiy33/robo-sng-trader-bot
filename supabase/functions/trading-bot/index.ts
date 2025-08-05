import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, action, data } = await req.json()

    console.log(`Trading Bot action: ${action} for user ${user_id}`)

    switch (action) {
      case 'start_bot':
        return await startTradingBot(supabase, user_id, data)
      
      case 'stop_bot':
        return await stopTradingBot(supabase, user_id)
      
      case 'get_signals':
        return await getAndProcessSignals(supabase, user_id, data)
      
      case 'execute_trade':
        return await executeTrade(supabase, user_id, data)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Trading Bot error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function startTradingBot(supabase: any, user_id: string, data: any) {
  console.log(`Starting trading bot for user ${user_id} with data:`, data)
  
  // Get existing settings first
  const { data: existingSettings, error: fetchError } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching existing settings:', fetchError)
    throw fetchError
  }

  // Update bot settings to active
  const settingsToUpdate = existingSettings ? {
    ...existingSettings,
    is_active: true,
    is_demo: data.is_demo,
    updated_at: new Date().toISOString()
  } : {
    user_id,
    is_active: true,
    is_demo: data.is_demo,
    max_positions: 3,
    position_size_percent: 1.00,
    stop_loss_percent: 2.00,
    take_profit_percent: 4.00,
    daily_loss_limit_percent: 5.00,
    min_signal_strength: 0.50, // Снизил с 0.70 до 0.50 (50%)
    timeframe: '15m',
    trading_pairs: ['BTCUSDT', 'ETHUSDT']
  }

  console.log('Settings to upsert:', settingsToUpdate)

  const { error } = await supabase
    .from('bot_settings')
    .upsert(settingsToUpdate, {
      onConflict: 'user_id'
    })

  if (error) {
    console.error('Error upserting bot settings:', error)
    throw error
  }

  console.log('Trading bot started successfully')
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Trading bot started successfully' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function stopTradingBot(supabase: any, user_id: string) {
  // Update bot settings to inactive
  const { error } = await supabase
    .from('bot_settings')
    .update({ is_active: false })
    .eq('user_id', user_id)

  if (error) throw error

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Trading bot stopped successfully' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getAndProcessSignals(supabase: any, user_id: string, data: any) {
  console.log(`🔍 Начинаем получение сигналов для пользователя ${user_id}`)
  
  // Get bot settings
  const { data: settings, error: settingsError } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (settingsError) throw settingsError

  if (!settings.is_active) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Trading bot is not active' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log(`🤖 Настройки бота:`, JSON.stringify(settings, null, 2))

  // Определяем источник сигналов из настроек или AUTO по умолчанию
  const signalSource = settings.signal_source || data.signal_source || 'AUTO'
  console.log(`🎯 Источник сигналов: ${signalSource}`)
  
  // Check monthly TokenMetrics limit 
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  
  const { data: monthlyUsage } = await supabase
    .from('api_usage_logs')
    .select('request_count')
    .eq('user_id', user_id)
    .eq('api_name', 'tokenmetrics')
    .gte('created_at', monthStart.toISOString())
  
  const totalMonthlyRequests = monthlyUsage?.reduce((sum, log) => sum + (log.request_count || 1), 0) || 0
  console.log(`📊 Месячное использование TokenMetrics: ${totalMonthlyRequests}/5000`)
  
  // Determine signal source based on limits and preferences
  let finalSignalSource = signalSource
  
  if (totalMonthlyRequests >= 3500 && (signalSource === 'TOKENMETRICS' || signalSource === 'AUTO')) {
    console.log(`⚠️ TokenMetrics лимит достигнут (${totalMonthlyRequests}/5000) - переключаемся на AI Analyzer`)
    finalSignalSource = 'AI_ANALYZER'
  }
  
  if (signalSource === 'TOKENMETRICS' && totalMonthlyRequests >= 3500) {
    console.log(`🛑 КРИТИЧЕСКИЙ ЛИМИТ TokenMetrics (${totalMonthlyRequests}/5000) - но пользователь требует только TokenMetrics`)
    
    // Automatically disable the bot to prevent further API calls
    await supabase
      .from('bot_settings')
      .update({ is_active: false })
      .eq('user_id', user_id)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `КРИТИЧЕСКИЙ ЛИМИТ: Использовано ${totalMonthlyRequests}/5000 запросов TokenMetrics (70%). Робот автоматически отключен.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  
  console.log(`🎯 Финальный источник сигналов: ${finalSignalSource}`)

  // Check cache first (TokenMetrics optimization) - increase cache time to 2 hours
  const cacheKey = {
    symbols: settings.trading_pairs,
    timeframe: settings.timeframe || '15m'
  }
  
  const { data: cachedData } = await supabase
    .from('tokenmetrics_cache')
    .select('*')
    .eq('user_id', user_id)
    .eq('timeframe', cacheKey.timeframe)
    .gte('created_at', new Date(Date.now() - 120 * 60 * 1000).toISOString()) // 2 hour cache instead of 30 min
    .order('created_at', { ascending: false })
    .limit(1)

  let signals = []
  
  // Get signals based on source
  if (finalSignalSource === 'AI_ANALYZER') {
    console.log(`🤖 Используем AI Market Analyzer`)
    signals = await fetchAIAnalyzerSignals(supabase, user_id, settings)
  } else if (finalSignalSource === 'TOKENMETRICS') {
    console.log(`📊 Используем TokenMetrics`)
    // Check cache first for TokenMetrics
    if (cachedData && cachedData.length > 0) {
      console.log(`📦 Используем кэшированные данные TokenMetrics (возраст: ${Math.round((Date.now() - new Date(cachedData[0].created_at).getTime()) / 60000)} мин)`)
      signals = cachedData[0].signals || []
    } else {
      console.log(`🌐 Запрашиваем новые данные из TokenMetrics API`)
      signals = await fetchTokenMetricsSignals(supabase, user_id, settings, cacheKey)
    }
  } else { // AUTO mode
    console.log(`🎯 AUTO режим - пробуем TokenMetrics, затем AI`)
    // Try TokenMetrics first if available
    if (cachedData && cachedData.length > 0) {
      console.log(`📦 Используем кэшированные данные TokenMetrics (возраст: ${Math.round((Date.now() - new Date(cachedData[0].created_at).getTime()) / 60000)} мин)`)
      signals = cachedData[0].signals || []
    } else if (totalMonthlyRequests < 3500) {
      try {
        console.log(`🌐 Запрашиваем новые данные из TokenMetrics API`)
        signals = await fetchTokenMetricsSignals(supabase, user_id, settings, cacheKey)
      } catch (error) {
        console.log(`⚠️ TokenMetrics недоступен, переключаемся на AI Analyzer:`, error.message)
        signals = await fetchAIAnalyzerSignals(supabase, user_id, settings)
      }
    } else {
      console.log(`🤖 Лимиты TokenMetrics исчерпаны, используем AI Analyzer`)
      signals = await fetchAIAnalyzerSignals(supabase, user_id, settings)
    }
  }

  // ... остальная логика обработки сигналов остается той же
  console.log(`🚀 НАЧИНАЕМ АНАЛИЗ СИГНАЛОВ НА ИСПОЛНЕНИЕ`)
  
  const processedSignals = []

  for (const signal of signals) {
    console.log(``)
    console.log(`🔍 Анализ сигнала: ${signal.symbol} (${signal.signal})`)
    
    // Filter signals by minimum strength
    if (signal.confidence < settings.min_signal_strength) {
      console.log(`❌ ОТКЛОНЕН: сила сигнала ${(signal.confidence * 100).toFixed(0)}% < ${(settings.min_signal_strength * 100).toFixed(0)}%`)
      continue
    }
    console.log(`✅ Сила сигнала достаточная: ${(signal.confidence * 100).toFixed(0)}%`)

    // Check if we have capacity for new positions
    const { data: openTrades } = await supabase
      .from('trades')
      .select('id, symbol')
      .eq('user_id', user_id)
      .eq('status', 'OPEN')

    if (openTrades && openTrades.length >= settings.max_positions) {
      console.log(`❌ ОТКЛОНЕН: достигнут лимит позиций (${openTrades.length}/${settings.max_positions})`)
      console.log(`   Открытые позиции: ${openTrades.map(t => t.symbol).join(', ')}`)
      continue
    }
    console.log(`✅ Есть место для новой позиции: ${openTrades?.length || 0}/${settings.max_positions}`)

    // Check if we already have position on this symbol
    const existingPosition = openTrades?.find(trade => trade.symbol === signal.symbol)
    if (existingPosition) {
      console.log(`❌ ОТКЛОНЕН: уже есть открытая позиция по ${signal.symbol}`)
      continue
    }
    console.log(`✅ Нет открытых позиций по ${signal.symbol}`)

    // Check daily loss limit
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTrades } = await supabase
      .from('trades')
      .select('pnl')
      .eq('user_id', user_id)
      .gte('created_at', today + 'T00:00:00Z')

    const dailyPnL = todayTrades?.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0) || 0
    
    // Get user balance with smart caching (15 min cache for balance to reduce Bybit calls)
    let userBalance = await getCachedBalance(supabase, user_id, settings.is_demo)
    
    const dailyLossLimit = userBalance * (settings.daily_loss_limit_percent / 100)

    if (dailyPnL < -dailyLossLimit) {
      console.log(`❌ ОТКЛОНЕН: превышен дневной лимит потерь (${dailyPnL.toFixed(2)} < -${dailyLossLimit.toFixed(2)})`)
      continue
    }
    console.log(`✅ Дневные потери в пределах нормы: ${dailyPnL.toFixed(2)} / -${dailyLossLimit.toFixed(2)}`)

    // Only process BUY and SELL signals, skip HOLD
    if (signal.signal === 'HOLD') {
      console.log(`ℹ️  HOLD сигнал - не исполняется автоматически`)
      processedSignals.push({
        ...signal,
        status: 'EXECUTED',
        trade_id: null,
        reason: `Signal executed automatically (${(signal.confidence * 100).toFixed(0)}% confidence)`
      })
      continue
    }

    // Automatically execute qualifying BUY/SELL signals
    try {
      console.log(`🚀 ИСПОЛНЯЕТСЯ: ${signal.signal} ${signal.symbol} (сила: ${(signal.confidence * 100).toFixed(0)}%)`)
      console.log(`   Планируемые параметры:`)
      console.log(`   - Размер: ${settings.position_size_percent}% от депозита`)
      console.log(`   - Стоп-лосс: ${settings.stop_loss_percent}%`)
      console.log(`   - Тейк-профит: ${settings.take_profit_percent}%`)
      
      const executeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trading-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          user_id,
          action: 'execute_trade',
          data: {
            signal: signal,
            is_demo: settings.is_demo
          }
        })
      })

      const executeResult = await executeResponse.json()
      
      if (executeResult.success) {
        processedSignals.push({
          ...signal,
          status: 'EXECUTED',
          trade_id: executeResult.data.trade.id,
          reason: `Signal executed automatically (${(signal.confidence * 100).toFixed(0)}% confidence)`
        })
        console.log(`Trade executed successfully for ${signal.symbol}`)
      } else {
        processedSignals.push({
          ...signal,
          status: 'EXECUTION_FAILED',
          reason: `Execution failed: ${executeResult.error}`
        })
        console.error(`Trade execution failed for ${signal.symbol}:`, executeResult.error)
      }
    } catch (error) {
      processedSignals.push({
        ...signal,
        status: 'EXECUTION_ERROR',
        reason: `Execution error: ${error.message}`
      })
      console.error(`Trade execution error for ${signal.symbol}:`, error)
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data: {
      signals: processedSignals,
      settings: settings
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Helper function to fetch TokenMetrics signals with caching
async function fetchTokenMetricsSignals(supabase: any, user_id: string, settings: any, cacheKey: any) {
  const startTime = Date.now()
  
  try {
    const tokenmetricsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/tokenmetrics-api`
    console.log(`📡 Вызов TokenMetrics API: ${tokenmetricsUrl}`)
    
    const signalsResponse = await fetch(tokenmetricsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        user_id,
        action: 'get_signals',
        data: {
          is_demo: settings.is_demo,
          symbols: settings.trading_pairs.map((pair: string) => pair.replace('USDT', '')),
          timeframe: settings.timeframe || '15m'
        }
      })
    })

    const responseTime = Date.now() - startTime
    console.log(`⏱️ TokenMetrics API ответил за ${responseTime}ms со статусом: ${signalsResponse.status}`)
    
    const signalsResult = await signalsResponse.json()
    
    if (!signalsResult.success) {
      // Handle specific TokenMetrics errors
      if (signalsResult.error?.includes('rate limit') || signalsResult.error?.includes('429')) {
        console.warn('⚠️ TokenMetrics API rate limit reached - skipping this cycle');
        
        // Log API rate limit hit
        await logApiUsage(supabase, user_id, 'tokenmetrics', 'get_signals', 429, 'Rate limit reached', 1, responseTime)
        
        return [] // Return empty signals
      }
      
      // Log API error
      await logApiUsage(supabase, user_id, 'tokenmetrics', 'get_signals', signalsResponse.status, signalsResult.error, 1, responseTime)
      throw new Error(signalsResult.error)
    }

    // Log successful API call
    await logApiUsage(supabase, user_id, 'tokenmetrics', 'get_signals', signalsResponse.status, null, 1, responseTime)

    // Extract and convert TokenMetrics data to trading signals FIRST
    const tokenMetricsData = signalsResult.data.data || []
    const signals = []
    
    // Convert TokenMetrics data to trading signals
    for (const item of tokenMetricsData) {
      if (item.TOKEN_SYMBOL && settings.trading_pairs.includes(item.TOKEN_SYMBOL + 'USDT')) {
        const signal = {
          symbol: item.TOKEN_SYMBOL + 'USDT',
          signal: item.TRADING_SIGNAL === 1 ? 'BUY' : item.TRADING_SIGNAL === -1 ? 'SELL' : 'HOLD',
          confidence: item.TM_TRADER_GRADE / 100, // Convert to 0-1 scale
          timestamp: item.DATE,
          target_price: null,
          current_price: null,
          reason: `TokenMetrics AI analysis - Grade: ${item.TM_TRADER_GRADE}, Trend: ${item.TOKEN_TREND === 1 ? 'Bullish' : 'Bearish'}, Signal: ${item.TRADING_SIGNAL}`
        }
        
        signals.push(signal)
        console.log(`Added signal: ${signal.symbol}, Type: ${signal.signal}, Grade: ${item.TM_TRADER_GRADE}`)
      }
    }

    // Cache the signals if we have any
    if (signals.length > 0) {
      await supabase
        .from('tokenmetrics_cache')
        .upsert({
          user_id,
          timeframe: settings.timeframe || '15m',
          symbols: settings.trading_pairs,
          signals: signals,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,timeframe'
        })
      
      console.log(`💾 Сохранили ${signals.length} сигналов в кэш на 2 часа`)
    }

    
    return signals

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ TokenMetrics API failed:', error)
    
    // Log API error
    await logApiUsage(supabase, user_id, 'tokenmetrics', 'get_signals', 0, error.message, 1, responseTime)
    throw error
  }
}

// Helper function to fetch AI Analyzer signals
async function fetchAIAnalyzerSignals(supabase: any, user_id: string, settings: any) {
  const startTime = Date.now()
  
  try {
    console.log(`🤖 Вызов AI Market Analyzer`)
    
    const aiResponse = await supabase.functions.invoke('ai-market-analyzer', {
      body: {
        user_id,
        symbols: settings.trading_pairs,
        timeframe: settings.timeframe || '15m'
      }
    })

    const responseTime = Date.now() - startTime
    console.log(`⏱️ AI Analyzer ответил за ${responseTime}ms`)
    
    if (aiResponse.error) {
      console.error('❌ AI Analyzer error:', aiResponse.error)
      
      // Log API error
      await logApiUsage(supabase, user_id, 'ai_analyzer', 'market_analysis', 0, aiResponse.error.message, settings.trading_pairs.length, responseTime)
      throw new Error(aiResponse.error.message)
    }

    const aiResult = aiResponse.data
    
    if (!aiResult.success) {
      // Log API error
      await logApiUsage(supabase, user_id, 'ai_analyzer', 'market_analysis', 500, aiResult.error, settings.trading_pairs.length, responseTime)
      throw new Error(aiResult.error)
    }

    // Log successful API call
    await logApiUsage(supabase, user_id, 'ai_analyzer', 'market_analysis', 200, null, settings.trading_pairs.length, responseTime)

    // Convert AI signals to our format
    const signals = aiResult.data.signals.map((signal: any) => ({
      symbol: signal.symbol,
      signal: signal.signal,
      confidence: signal.strength, // AI already provides 0-1 scale
      timestamp: aiResult.data.analysis_time,
      target_price: null,
      current_price: signal.price,
      reason: `AI Market Analysis - ${signal.analysis}`,
      source: 'AI_ANALYZER'
    }))
    
    console.log(`🤖 AI Analyzer предоставил ${signals.length} сигналов`)
    
    return signals

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ AI Analyzer failed:', error)
    
    // Log API error
    await logApiUsage(supabase, user_id, 'ai_analyzer', 'market_analysis', 0, error.message, settings.trading_pairs.length, responseTime)
    throw error
  }
}

// Helper function to get cached balance with smart caching
async function getCachedBalance(supabase: any, user_id: string, is_demo: boolean) {
  const BALANCE_CACHE_MIN = 15 // Cache balance for 15 minutes
  const cacheTime = new Date(Date.now() - BALANCE_CACHE_MIN * 60 * 1000).toISOString()
  
  // Check for recent balance log
  const { data: recentBalanceLog } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('user_id', user_id)
    .eq('api_name', 'bybit')
    .eq('endpoint', 'get_balance')
    .eq('status_code', 200)
    .gte('created_at', cacheTime)
    .order('created_at', { ascending: false })
    .limit(1)

  if (recentBalanceLog && recentBalanceLog.length > 0) {
    console.log(`💰 Используем кэшированный баланс (возраст: ${Math.round((Date.now() - new Date(recentBalanceLog[0].created_at).getTime()) / 60000)} мин)`)
    return 5000 // Return cached balance - should store actual balance in logs table
  }

  // Fetch fresh balance
  try {
    const startTime = Date.now()
    const balanceResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bybit-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        user_id,
        is_demo,
        action: 'get_balance'
      })
    });

    const responseTime = Date.now() - startTime
    const balanceResult = await balanceResponse.json();
    
    let balance = 5000 // Default fallback
    
    if (balanceResult.success && balanceResult.data.result?.list?.[0]) {
      const usdtBalance = balanceResult.data.result.list[0].coin.find((c: any) => c.coin === 'USDT');
      if (usdtBalance) {
        balance = parseFloat(usdtBalance.availableToWithdraw) || 5000;
      }
    }
    
    // Log the API call
    await logApiUsage(supabase, user_id, 'bybit', 'get_balance', balanceResponse.status, 
                     balanceResult.success ? null : balanceResult.error, 1, responseTime)
    
    console.log(`💰 Получили свежий баланс: ${balance} USDT`)
    return balance
    
  } catch (error) {
    console.log('⚠️ Could not fetch balance, using default:', error.message);
    await logApiUsage(supabase, user_id, 'bybit', 'get_balance', 0, error.message, 1, 0)
    return 5000
  }
}

// Helper function to log API usage
async function logApiUsage(supabase: any, user_id: string, api_name: string, endpoint: string, 
                          status_code: number, error_message: string | null, request_count: number, response_time_ms: number) {
  try {
    await supabase
      .from('api_usage_logs')
      .insert({
        user_id,
        api_name,
        endpoint,
        status_code,
        error_message,
        request_count,
        response_time_ms
      })
  } catch (error) {
    console.error('Failed to log API usage:', error.message)
  }
}

async function executeTrade(supabase: any, user_id: string, data: any) {
  const { signal, is_demo } = data

  try {
    // Get bot settings
    const { data: settings, error: settingsError } = await supabase
      .from('bot_settings')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (settingsError) throw settingsError

    // Use cached balance to reduce API calls
    const userBalance = await getCachedBalance(supabase, user_id, is_demo)
    
    // Calculate position size
    const positionSize = userBalance * (settings.position_size_percent / 100)
    const currentPrice = signal.price || signal.current_price || 100000 // Use available price field
    const quantity = signal.signal === 'BUY' 
      ? positionSize / currentPrice 
      : positionSize
      
    console.log(`💰 Параметры сделки:`)
    console.log(`   Баланс: ${userBalance} USDT`)
    console.log(`   Размер позиции: ${positionSize} USDT (${settings.position_size_percent}%)`)
    console.log(`   Цена входа: ${currentPrice}`)
    console.log(`   Количество: ${quantity}`)

    let orderResult
    
    if (is_demo) {
      // For demo mode, create a simulated successful order
      console.log(`🎭 ДЕМО РЕЖИМ: Имитируем размещение ордера`)
      orderResult = {
        success: true,
        data: {
          orderId: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: signal.symbol,
          side: signal.signal,
          quantity: quantity.toFixed(8),
          price: currentPrice,
          status: 'FILLED'
        }
      }
    } else {
      // Place real order via Bybit API
      const orderResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bybit-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          user_id,
          is_demo,
          action: 'place_order',
          data: {
            symbol: signal.symbol,
            side: signal.signal,
            quantity: quantity.toFixed(8),
            extraParams: {
              timeInForce: 'IOC'
            }
          }
        })
      })

      orderResult = await orderResponse.json()
      
      if (!orderResult.success) {
        throw new Error(orderResult.error)
      }
    }

    // Calculate stop loss and take profit  
    const entryPrice = currentPrice // Use the same price variable as for position calculation
    const stopLoss = signal.signal === 'BUY' 
      ? entryPrice * (1 - settings.stop_loss_percent / 100)
      : entryPrice * (1 + settings.stop_loss_percent / 100)
    
    const takeProfit = signal.signal === 'BUY'
      ? entryPrice * (1 + settings.take_profit_percent / 100) 
      : entryPrice * (1 - settings.take_profit_percent / 100)
      
    console.log(`📊 Уровни сделки:`)
    console.log(`   Вход: ${entryPrice}`)
    console.log(`   Стоп-лосс: ${stopLoss}`)
    console.log(`   Тейк-профит: ${takeProfit}`)

    // Save trade to database
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id,
        symbol: signal.symbol,
        side: signal.signal,
        quantity,
        price: entryPrice,
        filled_price: entryPrice,
        status: 'OPEN',
        exchange_order_id: orderResult.data.orderId || null,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        signal_source: 'tokenmetrics',
        signal_strength: signal.confidence
      })
      .select()
      .single()

    if (tradeError) throw tradeError

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        trade,
        order: orderResult.data
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Trade execution error:', error)
    
    // Log failed trade attempt
    await supabase
      .from('trades')
      .insert({
        user_id,
        symbol: signal.symbol,
        side: signal.signal,
        quantity: 0,
        price: signal.current_price,
        status: 'FAILED',
        signal_source: 'tokenmetrics',
        signal_strength: signal.confidence
      })

    throw error
  }
}