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
    min_signal_strength: 0.70,
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

  console.log(`Getting signals for user ${user_id} with settings:`, JSON.stringify(settings, null, 2))

  // Get signals from TokenMetrics
  const tokenmetricsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/tokenmetrics-api`
  console.log(`Calling TokenMetrics API at: ${tokenmetricsUrl}`)
  
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

  console.log(`TokenMetrics API response status: ${signalsResponse.status}`)
  
  const signalsResult = await signalsResponse.json()
  console.log(`TokenMetrics API response:`, JSON.stringify(signalsResult, null, 2))
  
  if (!signalsResult.success) {
    console.error(`TokenMetrics API failed:`, signalsResult.error)
    throw new Error(signalsResult.error)
  }

  const signals = signalsResult.data.signals || []
  const processedSignals = []

  for (const signal of signals) {
    // Filter signals by minimum strength
    if (signal.confidence < settings.min_signal_strength) {
      console.log(`Signal ignored: ${signal.symbol} confidence ${signal.confidence} below threshold ${settings.min_signal_strength}`)
      continue
    }

    // Check if we have capacity for new positions
    const { data: openTrades } = await supabase
      .from('trades')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'OPEN')

    if (openTrades && openTrades.length >= settings.max_positions) {
      console.log(`Signal ignored: ${signal.symbol} - maximum positions reached (${openTrades.length}/${settings.max_positions})`)
      continue
    }

    // Check daily loss limit
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTrades } = await supabase
      .from('trades')
      .select('pnl')
      .eq('user_id', user_id)
      .gte('created_at', today + 'T00:00:00Z')

    const dailyPnL = todayTrades?.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0) || 0
    
    // Get user balance for percentage calculation (mock for now)
    const userBalance = 5000 // This should come from Bybit API
    const dailyLossLimit = userBalance * (settings.daily_loss_limit_percent / 100)

    if (dailyPnL < -dailyLossLimit) {
      console.log(`Signal ignored: ${signal.symbol} - daily loss limit exceeded (${dailyPnL} < -${dailyLossLimit})`)
      continue
    }

    // Automatically execute qualifying signals
    try {
      console.log(`Auto-executing signal for ${signal.symbol} (confidence: ${(signal.confidence * 100).toFixed(0)}%)`)
      
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

    // Calculate position size
    const userBalance = 5000 // This should come from Bybit API
    const positionSize = userBalance * (settings.position_size_percent / 100)
    const quantity = signal.signal === 'BUY' 
      ? positionSize / signal.current_price 
      : positionSize

    // Place order via Bybit API
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

    const orderResult = await orderResponse.json()
    
    if (!orderResult.success) {
      throw new Error(orderResult.error)
    }

    // Calculate stop loss and take profit
    const entryPrice = signal.current_price
    const stopLoss = signal.signal === 'BUY' 
      ? entryPrice * (1 - settings.stop_loss_percent / 100)
      : entryPrice * (1 + settings.stop_loss_percent / 100)
    
    const takeProfit = signal.signal === 'BUY'
      ? entryPrice * (1 + settings.take_profit_percent / 100) 
      : entryPrice * (1 - settings.take_profit_percent / 100)

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