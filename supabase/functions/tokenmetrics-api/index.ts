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

    console.log(`TokenMetrics API request: ${action} for user ${user_id}`)
    console.log(`Request data:`, JSON.stringify(data, null, 2))

    // Get user's TokenMetrics API credentials
    const { data: credentials, error: credError } = await supabase
      .from('tokenmetrics_credentials')
      .select('api_key')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single()

    console.log(`Credentials query result:`, { credentials, credError })

    if (credError || !credentials) {
      console.error('TokenMetrics credentials error:', credError)
      throw new Error('TokenMetrics API credentials not found')
    }

    console.log(`Using API key: ${credentials.api_key.substring(0, 10)}...`)

    const baseUrl = 'https://api.tokenmetrics.com/v2'
    let result = {}

    switch (action) {
      case 'get_signals':
        {
          const symbols = data?.symbols || ['BTC', 'ETH']
          
          console.log(`Making TokenMetrics API call to: ${baseUrl}/trading-signals`)
          console.log(`Symbols: ${symbols.join(',')}`)
          
          const response = await fetch(`${baseUrl}/trading-signals?symbol=${symbols.join(',')}`, {
            method: 'GET',
            headers: {
              'x-api-key': credentials.api_key,
              'Content-Type': 'application/json',
            }
          })

          console.log(`TokenMetrics API response status: ${response.status}`)
          console.log(`TokenMetrics API response headers:`, Object.fromEntries(response.headers.entries()))

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`TokenMetrics API error response:`, errorText)
            throw new Error(`TokenMetrics API error: ${response.status} - ${errorText}`)
          }

          result = await response.json()
          console.log(`TokenMetrics API success response:`, JSON.stringify(result, null, 2))
        }
        break

      case 'get_price_prediction':
        {
          const symbol = data?.symbol || 'BTC'
          
          const response = await fetch(`${baseUrl}/v1/predictions/${symbol}`, {
            headers: {
              'Authorization': `Bearer ${credentials.api_key}`,
            }
          })

          if (!response.ok) {
            throw new Error(`TokenMetrics API error: ${response.status}`)
          }

          result = await response.json()
        }
        break

      case 'get_market_analysis':
        {
          const response = await fetch(`${baseUrl}/v1/analysis/market`, {
            headers: {
              'Authorization': `Bearer ${credentials.api_key}`,
            }
          })

          if (!response.ok) {
            throw new Error(`TokenMetrics API error: ${response.status}`)
          }

          result = await response.json()
        }
        break

      default:
        // For demo purposes, return mock data if action not implemented
        result = {
          signals: [
            {
              symbol: 'BTCUSDT',
              signal: 'BUY',
              confidence: 0.85,
              timestamp: new Date().toISOString(),
              target_price: 44000,
              current_price: 43100,
              reason: 'Strong bullish momentum detected by AI analysis'
            },
            {
              symbol: 'ETHUSDT', 
              signal: 'BUY',
              confidence: 0.78,
              timestamp: new Date().toISOString(),
              target_price: 2650,
              current_price: 2620,
              reason: 'Positive market sentiment and technical indicators'
            }
          ]
        }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('TokenMetrics API error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})