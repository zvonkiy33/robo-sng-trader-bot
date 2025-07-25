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

    const { user_id, is_demo, action, data } = await req.json()

    console.log(`Bybit API request: ${action} for user ${user_id}`)

    // Get user's Bybit API credentials
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('api_key, api_secret')
      .eq('user_id', user_id)
      .eq('is_demo', is_demo)
      .eq('is_active', true)
      .single()

    if (credError || !credentials) {
      throw new Error('API credentials not found')
    }

    const baseUrl = is_demo ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'

    // Generate signature for Bybit API
    function generateSignature(params: Record<string, any>, apiSecret: string) {
      const timestamp = Date.now().toString()
      const recv_window = '5000'
      
      params.api_key = credentials.api_key
      params.timestamp = timestamp
      params.recv_window = recv_window

      const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')

      const encoder = new TextEncoder()
      const data = encoder.encode(paramString + apiSecret)
      
      return crypto.subtle.importKey(
        'raw',
        encoder.encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ).then(key => 
        crypto.subtle.sign('HMAC', key, encoder.encode(paramString))
      ).then(signature => 
        Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      )
    }

    let result = {}

    switch (action) {
      case 'get_balance':
        {
          const params = { 
            accountType: 'UNIFIED',
            coin: data?.coin || 'USDT'
          }
          
          const signature = await generateSignature(params, credentials.api_secret)
          
          const response = await fetch(`${baseUrl}/v5/account/wallet-balance?${new URLSearchParams({
            ...params,
            api_key: credentials.api_key,
            timestamp: params.timestamp,
            recv_window: params.recv_window,
            sign: signature
          })}`, {
            headers: {
              'X-BAPI-API-KEY': credentials.api_key,
              'X-BAPI-TIMESTAMP': params.timestamp,
              'X-BAPI-RECV-WINDOW': params.recv_window,
              'X-BAPI-SIGN': signature,
            }
          })

          result = await response.json()
        }
        break

      case 'place_order':
        {
          const orderParams = {
            category: 'spot',
            symbol: data.symbol,
            side: data.side,
            orderType: 'Market',
            qty: data.quantity.toString(),
            ...data.extraParams
          }

          const signature = await generateSignature(orderParams, credentials.api_secret)

          const response = await fetch(`${baseUrl}/v5/order/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-BAPI-API-KEY': credentials.api_key,
              'X-BAPI-TIMESTAMP': orderParams.timestamp,
              'X-BAPI-RECV-WINDOW': orderParams.recv_window,
              'X-BAPI-SIGN': signature,
            },
            body: JSON.stringify(orderParams)
          })

          result = await response.json()
        }
        break

      case 'get_positions':
        {
          const params = {
            category: 'spot',
            symbol: data?.symbol || ''
          }

          const signature = await generateSignature(params, credentials.api_secret)

          const response = await fetch(`${baseUrl}/v5/position/list?${new URLSearchParams({
            ...params,
            api_key: credentials.api_key,
            timestamp: params.timestamp,
            recv_window: params.recv_window,
            sign: signature
          })}`, {
            headers: {
              'X-BAPI-API-KEY': credentials.api_key,
              'X-BAPI-TIMESTAMP': params.timestamp,
              'X-BAPI-RECV-WINDOW': params.recv_window,
              'X-BAPI-SIGN': signature,
            }
          })

          result = await response.json()
        }
        break

      case 'get_kline_data':
        {
          // Historical price data - no authentication required for public data
          const symbol = data.symbol || 'BTCUSDT'
          const interval = data.interval || '60' // Use number format: 1, 5, 15, 30, 60, etc.
          const limit = data.limit || 200 // Max 1000
          
          // Convert interval to Bybit format
          const intervalMap: Record<string, string> = {
            '1m': '1',
            '5m': '5', 
            '15m': '15',
            '30m': '30',
            '1h': '60',
            '4h': '240',
            '1d': '1440'
          }
          
          const bybitInterval = intervalMap[interval] || interval
          
          let url = `${baseUrl}/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`
          
          console.log(`Fetching kline data from: ${url}`)

          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json'
            }
          })

          result = await response.json()
        }
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Bybit API error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})