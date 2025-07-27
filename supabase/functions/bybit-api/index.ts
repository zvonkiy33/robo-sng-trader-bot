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

    // Get user's API credentials using secure function
    const { data: credentialsResult, error: credError } = await supabase
      .rpc('get_decrypted_credentials', {
        p_user_id: user_id,
        p_exchange: 'bybit',
        p_is_demo: is_demo || true
      })

    if (credError || !credentialsResult || credentialsResult.length === 0) {
      console.error('Credentials error:', credError)
      throw new Error('Bybit API credentials not found')
    }

    const credentials = credentialsResult[0]

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
          
          result = await callBybitWithRetry(`${baseUrl}/v5/account/wallet-balance?${new URLSearchParams({
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

          result = await callBybitWithRetry(`${baseUrl}/v5/order/create`, {
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
        }
        break

      case 'get_positions':
        {
          const params = {
            category: 'spot',
            symbol: data?.symbol || ''
          }

          const signature = await generateSignature(params, credentials.api_secret)

          result = await callBybitWithRetry(`${baseUrl}/v5/position/list?${new URLSearchParams({
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
          
          // ALWAYS use mainnet for price data (real prices)
          const publicUrl = 'https://api.bybit.com'
          let url = `${publicUrl}/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`
          
          console.log(`Fetching kline data from: ${url}`)

          result = await callBybitWithRetry(url, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
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

// Retry logic with proper error handling
async function callBybitWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} calling: ${url}`)
      
      const response = await fetch(url, options)
      
      // Check if response is OK
      if (!response.ok) {
        const textResponse = await response.text()
        console.error(`HTTP ${response.status}: ${textResponse}`)
        
        // Check if it's an HTML error page (server maintenance)
        if (textResponse.includes('DOCTYPE') || textResponse.includes('<html>')) {
          throw new Error(`Bybit API unavailable (HTTP ${response.status}): Server returned HTML instead of JSON`)
        }
        
        // Try to parse as JSON for API errors
        try {
          const errorData = JSON.parse(textResponse)
          throw new Error(`Bybit API error (HTTP ${response.status}): ${errorData.retMsg || textResponse}`)
        } catch {
          throw new Error(`Bybit API error (HTTP ${response.status}): ${textResponse}`)
        }
      }
      
      // Parse JSON response
      const jsonResponse = await response.json()
      
      // Check for Bybit API errors in successful HTTP responses
      if (jsonResponse.retCode && jsonResponse.retCode !== 0) {
        throw new Error(`Bybit API error (Code ${jsonResponse.retCode}): ${jsonResponse.retMsg}`)
      }
      
      console.log(`Success on attempt ${attempt}`)
      return jsonResponse
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message)
      
      // Don't retry on authentication or API key errors
      if (error.message.includes('invalid API key') || 
          error.message.includes('authentication') ||
          error.message.includes('unauthorized')) {
        throw error
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Bybit API failed after ${maxRetries} attempts: ${error.message}`)
      }
      
      // Exponential backoff: wait 1s, 2s, 4s...
      const delay = Math.pow(2, attempt - 1) * 1000
      console.log(`Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}